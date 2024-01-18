import fs from "fs-extra";
import strftime from "strftime";
import crypto from "crypto";
import fetch from "node-fetch";

class Microsoft {
  #BASE_URL = "https://microsoft-store.azurewebsites.net";

  constructor() {
    this.#start();
  }

  async #writeFile(outputFile, data) {
    await fs.outputFile(outputFile, JSON.stringify(data, null, 2));
  }

  async #start() {
    for (const mediaType of ["games", "apps"]) {
      const response = await fetch(
        `https://microsoft-store.azurewebsites.net/api/Reco/GetCollectionFiltersList?` +
          new URLSearchParams({
            mediaType,
          })
      );
      const [filter] = await response.json();
      for (const { choiceId } of filter.choices) {
        let pgNo = 1;
        while (true) {
          const response = await fetch(
            `https://microsoft-store.azurewebsites.net/api/Reco/GetComputedProductsList?` +
              new URLSearchParams({
                listName: choiceId.replace(/^./, choiceId[0].toUpperCase()),
                pgNo,
                noItems: 100,
                filteredCategories: "AllProducts",
                mediaType,
              })
          );
          const { productsList, nextPageNumber } = await response.json();
          if (nextPageNumber < 0) break;

          productsList.forEach(async ({ productId }) => {
            // for (const { productId } of productsList) {
            await this.#process(productId);
          });

          pgNo++;
        }
      }
    }
  }

  async #getDetail(productId) {
    const response = await fetch(
      `${this.#BASE_URL}/api/pages/pdp?` +
        new URLSearchParams({
          productId,
        })
    );
    return await response.json();
  }

  async #getRating(productId) {
    const response = await fetch(
      `${this.#BASE_URL}/api/Products/GetReviewsSummary/${productId}`
    );
    return await response.json();
  }

  async #getReviews(productId) {
    const reviews = [];
    let i = 1;

    while (true) {
      const response = await fetch(
        `${this.#BASE_URL}/api/products/getReviews/${productId}?` +
          new URLSearchParams({
            pgNo: i,
            noItems: 25,
          })
      );
      const { items, hasMorePages } = await response.json();

      reviews.push(...items);

      if (!hasMorePages) break;
      i++;
    }

    return reviews;
  }

  async #process(productId) {
    try {
      const app = await this.#getDetail(productId);
      const rating = await this.#getRating(productId);
      const reviews = await this.#getReviews(productId);

      const link = `${this.#BASE_URL}/detail/${app.productId}`;

      const { title } = app;
      const domain = this.#BASE_URL.split("/")[2];

      const log = {
        source: link,
        total_data: reviews.length,
        total_data_berhasil_diproses: 0,
        total_data_gagal_diproses: 0,
        PIC: "romy",
      };

      reviews.forEach(async (review) => {
        const username = review.reviewerName;

        const output = `data/${title}/${review.reviewId}.json`;
        try {
          await this.#writeFile(output, {
            link,
            domain,
            tag: link.split("/").slice(2),
            crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
            crawling_time_epoch: Date.now(),
            path_data_raw: `data/data_raw/data_review/${domain}/${title}/json/${review.reviewId}.json`,
            path_data_clean: `data/data_clean/data_review/${domain}/${title}/json/${review.reviewId}.json`,
            reviews_name: title,
            release_date_reviews: strftime(
              "%Y-%m-%d %H:%M:%S",
              new Date(app.releaseDateUtc)
            ),
            release_date_epoch_reviews: new Date(app.releaseDateUtc).getTime(),
            description_reviews: app.description,
            developer_reviews: app.developerName.length
              ? app.developerName
              : null,
            publisher_reviews: app.publisherName.length
              ? app.publisherName
              : null,
            features_reviews: app.features,
            website_url_reviews: app.appWebsiteUrl,
            product_ratings_reviews: app.productRatings.map(
              (rating) => rating.description
            ),
            system_requirements_reviews: Object.fromEntries(
              Object.entries(app.systemRequirements).map(([key, value]) => {
                return [
                  key,
                  value.items.map((item) => {
                    return {
                      name: item.name,
                      description: item.description,
                    };
                  }),
                ];
              })
            ),
            approximate_size_in_bytes_reviews: app.approximateSizeInBytes,
            maxInstall_size_in_bytes_reviews: app.maxInstallSizeInBytes,
            permissions_required_reviews: app.permissionsRequired,
            installation_reviews: app.installationTerms,
            allowed_platforms_reviews: app.allowedPlatforms,
            screenshots_reviews: app.screenshots.map(
              (screenshot) => screenshot.url
            ),
            location_reviews: null,
            category_reviews: "application",
            total_reviews: rating.reviewCount,
            review_info: Object.fromEntries(
              Object.entries(rating)
                .filter(([key]) => key.endsWith("ReviewCount"))
                .map(([key, value]) => [key.charAt(4), value])
            ),
            total_ratings: app.ratingCount,
            rating_info: Object.fromEntries(
              Object.entries(rating)
                .filter(([key]) => /(\d+)Count$/.test(key))
                .map(([key, value]) => [key.charAt(4), value])
            ),
            reviews_rating: {
              total_rating: rating.averageRating,
              detail_total_rating: null,
            },
            detail_reviews: {
              username_reviews: username,
              image_reviews: null,
              created_time: strftime(
                "%Y-%m-%d %H:%M:%S",
                new Date(review.submittedDateTimeUtc)
              ),
              created_time_epoch: new Date(
                review.submittedDateTimeUtc
              ).getTime(),
              email_reviews: null,
              company_name: null,
              location_reviews: null,
              title_detail_reviews: review.title,
              reviews_rating: review.rating,
              detail_reviews_rating: null,
              total_likes_reviews: review.helpfulPositive,
              total_dislikes_reviews: review.helpfulNegative,
              total_reply_reviews: null,
              content_reviews: review.reviewText,
              reply_content_reviews: null,
              date_of_experience: null,
              date_of_experience_epoch: null,
            },
          });
          log.total_data_berhasil_diproses += 1;
          console.log(output);
        } catch (e) {
          log.total_data_gagal_diproses += 1;
        }
      });
      fs.appendFile("log.txt", JSON.stringify(log) + "\n");
    } catch (e) {
      fs.appendFile("error.txt", e.toString() + "\n");
    }
  }
}

new Microsoft();
// new Microsoft("9N720LBNMTFT");
