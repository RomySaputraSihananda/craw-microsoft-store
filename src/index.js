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

  async #start() {
    const app = await this.#getDetail();
    console.log({
      link: `${this.#BASE_URL}/detail/${app.productId}`,
      domain: this.#BASE_URL.split("/")[2],
      tag: `${this.#BASE_URL}/detail/${app.productId}`.split("/").slice(2),
      crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
      crawling_time_epoch: Date.now(),
      path_data_raw: "string",
      path_data_clean: "string",
      reviews_name: "string",
      location_reviews: "string",
      category_reviews: "string",
      total_reviews: "integer",
      reviews_rating: {
        total_rating: "integer",
        detail_total_rating: [
          {
            score_rating: "integer",
            category_rating: "string",
          },
        ],
      },
    });
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
}

// new Microsoft();

const response = await fetch(
  `https://microsoft-store.azurewebsites.net/api/products/getReviews/9NH2GPH4JZS4?` +
    new URLSearchParams({
      pgNo: 1,
      noItems: 25,
    })
);
const { items } = await response.json();
await fs.outputFile("ratingReview.json", JSON.stringify(items, null, 2));
