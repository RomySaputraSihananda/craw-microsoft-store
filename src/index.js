import fs from "fs-extra";
import strftime from "strftime";

class Microsoft {
  #BASE_URL = "https://microsoft-store.azurewebsites.net";
  constructor() {
    this.#start();
  }

  async #writeFile(outputFile, data) {
    await fs.outputFile(outputFile, JSON.stringify(data, null, 2));
  }

  async #getDetail() {
    const response = await fetch(
      `${this.#BASE_URL}/api/pages/pdp?` +
        new URLSearchParams({
          productId: "9NH2GPH4JZS4",
        })
    );
    return await response.json();
  }

  async #getRating() {
    const response = await fetch(
      `${this.#BASE_URL}/api/Products/GetReviewsSummary/9NH2GPH4JZS4`
    );
    return await response.json();
  }

  async #getReviews() {
    const response = await fetch(
      `https://microsoft-store.azurewebsites.net/api/products/getReviews/9NH2GPH4JZS4?` +
        new URLSearchParams({
          pgNo: 1,
          noItems: 25,
        })
    );
    const { items } = await response.json();

    return items;
  }

  async #start() {
    const app = await this.#getDetail();
    const rating = await this.#getRating();
    const reviews = await this.#getReviews();

    const link = `${this.#BASE_URL}/detail/${app.productId}`;

    const { title } = app;
    const domain = this.#BASE_URL.split("/")[2];

    reviews.forEach((review) => {
      const { reviewerName } = review;

      this.#writeFile(`data/${title}/${reviewerName}.json`, {
        link,
        domain,
        tag: link.split("/").slice(2),
        crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
        crawling_time_epoch: Date.now(),
        path_data_raw: `data/data_raw/data_review/${domain}/${title}/json/${reviewerName}.json`,
        path_data_clean: `data/data_clean/data_review/${domain}/${title}/json/${reviewerName}.json`,
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
        message_reviews: app.appExtension.appExtMessage,
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
          username_reviews: reviewerName,
          image_reviews: null,
          created_time: strftime(
            "%Y-%m-%d %H:%M:%S",
            new Date(review.submittedDateTimeUtc)
          ),
          created_time_epoch: new Date(review.submittedDateTimeUtc).getTime(),
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
    });
  }
}

new Microsoft();
