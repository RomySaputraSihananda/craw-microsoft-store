import fs from "fs-extra";
import strftime from "strftime";
import crypto from "crypto";
import fetch from "node-fetch";
import { infoLog, updateLog, writeLog } from "./utils/logsio.js";
import { uploadS3Json } from "./utils/upload-s3.js";
class Microsoft {
  #BASE_URL = "https://microsoft-store.azurewebsites.net";
  #id_project = crypto.createHash("md5").update(this.#BASE_URL).digest("hex");
  #fileNameLog = "Monitoring data.json";

  constructor() {
    this.#start();
  }

  async #writeFile(outputFile, data) {
    await fs.outputFile(outputFile, JSON.stringify(data, null, 2));
  }

  async #start() {
    for (const mediaType of ["games", "apps"]) {
      const response = await fetch(
        `${this.#BASE_URL}/api/Reco/GetCollectionFiltersList?` +
          new URLSearchParams({
            mediaType,
          })
      );
      const [filter] = await response.json();
      for (const { choiceId } of filter.choices) {
        let pgNo = 1;
        while (true) {
          const response = await fetch(
            `${this.#BASE_URL}/api/Reco/GetComputedProductsList?` +
              new URLSearchParams({
                listName: choiceId.replace(/^./, choiceId[0].toUpperCase()),
                pgNo,
                noItems: 5,
                filteredCategories: "AllProducts",
                mediaType,
              })
          );

          const { productsList, nextPageNumber } = await response.json();
          if (nextPageNumber < 0) break;

          await Promise.all(
            productsList.map(async ({ productId }) => {
              await this.#process(productId);
            })
          );
          throw new Error("End");

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

      const headers = {
        link,
        domain,
        tag: link.split("/").slice(2),
        crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
        crawling_time_epoch: Date.now(),
        reviews_name: title,
        release_date_reviews: strftime(
          "%Y-%m-%d %H:%M:%S",
          new Date(app.releaseDateUtc)
        ),
        release_date_epoch_reviews: new Date(app.releaseDateUtc).getTime(),
        description_reviews: app.description,
        developer_reviews: app.developerName.length ? app.developerName : null,
        publisher_reviews: app.publisherName.length ? app.publisherName : null,
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
        path_data_raw: `S3://ai-pipeline-statistics/data/data_raw/data_review/microsoft_store/${app.title}/json/detail.json`,
        path_data_clean: `S3://ai-pipeline-statistics/data/data_clean/data_review/microsoft_store/${app.title}/json/detail.json`,
      };

      await Promise.all(
        [
          `data/data_raw/data_review/microsoft_store/${title}/json/detail.json`,
          `data/data_clean/data_review/microsoft_store/${title}/json/detail.json`,
        ].map((outputFile) => {
          // this.#writeFile(outputFile, headers);

          return uploadS3Json(outputFile, headers).then(() => {});
        })
      );

      const log = {
        Crawlling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
        id_project: null,
        project: "Data Intelligence",
        sub_project: "data review",
        source_name: this.#BASE_URL.split("/")[2],
        sub_source_name: title,
        id_sub_source: app.productId.toString(),
        total_data: reviews.length,
        total_success: 0,
        total_failed: 0,
        status: "Process",
        assign: "romy",
      };
      writeLog(log);

      for (const review of reviews) {
        const username = review.reviewerName;

        try {
          const data = {
            ...headers,
            path_data_raw: `S3://ai-pipeline-statistics/data/data_raw/data_review/microsoft_store/${title}/json/data_review/${review.reviewId}.json`,
            path_data_clean: `S3://ai-pipeline-statistics/data/data_clean/data_review/microsoft_store/${title}/json/data_review/${review.reviewId}.json`,
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
          };

          await Promise.all(
            [
              `data/data_raw/data_review/microsoft_store/${title}/json/data_review/${review.reviewId}.json`,
              `data/data_clean/data_review/microsoft_store/${title}/json/data_review/${review.reviewId}.json`,
            ].map((outputFile) => {
              return uploadS3Json(outputFile, data).then(() =>
                console.log(outputFile)
              );
            })
          );

          log.total_success += 1;

          updateLog(log);
          infoLog(log, review.reviewId, "success");
        } catch (e) {
          log.total_failed += 1;
          infoLog(log, review.reviewId, "error", e, "Send to S3");
        }
      }

      log.status = "Done";

      updateLog(log);
    } catch (e) {}
  }
}

new Microsoft();
