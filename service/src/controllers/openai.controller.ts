/* eslint-disable @typescript-eslint/no-unused-vars */
import OpenAI from "openai";

const openai = new OpenAI();

// GPT MODELS
const GPT_3_5_TURBO = "gpt-3.5-turbo";
const GPT_4o = "gpt-4o";
const GPT_4_TURBO = "gpt-4-turbo";
const GPT_4o_MINI = "gpt-4o-mini";

// GPT ROLES
const USER = "user";
const ASSISTANT = "assistant";
const SYSTEM = "system";

// SYSTEM CONTENT
const PROMPT = `You are a bot designed to process and summarize product reviews given in the form of a JSON object in a string. Given the JSON object below, you must analyze the comments to create a brief summary.

Example JSON Object:

[
  {
    "title": "Not the best insulation",
    "review": "While it does keep my coffee warm, it doesn't stay hot as long as I expected.",
    "score": 3
  },
  {
    "title": "Nicht die beste Isolierung",
    "review": "Obwohl er meinen Kaffee warm hält, bleibt er nicht so lange heiß, wie ich erwartet habe.",
    "score": 3
  }
]

Summarize these comments into four categories: "summary", "common positive comment", "common negative comments", "notable observation". The summaries shouldn't exceed 3 sentences.

Translate the generated summaries to these languages [tr, en, fr, de, nl].

Do not take any discriminative, rude and bad comments to summary as a parameter.

The output must be a JSON object as shown below, all values as strings. Do not stringify the JSON response. Do not add any spacing to JSON response:

{
  "summary": {
    "tr": "string",
    "en": "string",
    "fr": "string",
    "de": "string",
    "nl": "string"
  },
  "commonPositive": {
    "tr": "string",
    "en": "string",
    "fr": "string",
    "de": "string",
    "nl": "string"
  },
  "commonNegative": {
    "tr": "string",
    "en": "string",
    "fr": "string",
    "de": "string",
    "nl": "string"
  },
  "noteableObservation": {
    "tr": "string",
    "en": "string",
    "fr": "string",
    "de": "string",
    "nl": "string"
  }
}

Remember, the output must be a valid JSON object like stated above.`;

export const sendReviewsToGPT = async (reviews: any): Promise<any> => {
    const response = await openai.chat.completions.create({
        model: GPT_4o,
        temperature: 1,
        messages: [
          {
            role: USER,
            content: JSON.stringify(reviews),
          },
          {
            role: SYSTEM,
            content: PROMPT,
          },
        ],
      });
      return response.choices[0].message.content;
};