import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { items,summary } = req.body;
    // console.log(items)

    try {
        const response = await fetch(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            Authorization: "Bearer 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",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: "meta-llama/llama-3.1-8b-instruct:free",
                            messages: [
                                {
                                    role: "system",
                                    content:
                                        "you will help write a summary for the user comments based on the video summary provided. do not include any extra lines of content.",
                                },
                                { role: "user", content: items},
                                { role: "user", content: summary},
                            ],
                        }),
                    }
                ).then((res) => {
                    return res.json();
                });

        return res.status(200).json({ data: response.choices[0].message.content });
    } catch (error) {
        throw Error(error as string);
    }
}
