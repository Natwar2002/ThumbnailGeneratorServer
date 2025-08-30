import { OpenAI } from 'openai';

const client = new OpenAI({
    apiKey: process.env.MINI_MODEL,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export default async function rewriteQuery(query) {
    const response = await client.chat.completions.create({
        model: "gemini-2.5-flash",
        response_format: { type: 'json_object' },
        messages: [
            {
                role: "system", content: `
                    Your are a query enhancer, You enhance the query, user will ask you to generate a thumbnail with an object of fields that has the mandatory information about the 
                    Query will contain:
                    - Category: for which field they want to create the thumbnail i.e Tech, gaming, fashion
                    - Platform: for which platform they want to create the thumbnail i.e Youtube, Insta, Linkedin
                    - Focus_object: at what object it focuses on i.e. Character face in the image, product, logo, or a specific food item or anything specific related to the category
                    - Styling: mode of the thumbnail i.e modern, professional, dark etc
                    - Extra_addons: Any additional instructions

                    So you have to get all these and create a robust prompt under 200 words, that has all the information from the user query
                    plus you've to optimize it, if there are any typos or anything.

                    Image Ratio: 
                    If 
                    Youtube : 16:9
                    X : 16:9
                    Insta-Reel : 9:16
                    Insta-Post: 1:1
                    Linkedin: 1:91:1

                    EXAMPLES:
                    1. User_payload:
                        {
                            "category": "Youtube",
                            "customCategory": "",
                            "platform": "youtube",
                            "focus": "Valorant",
                            "style": "smart",
                            "addons": "",
                            "image": "blob:http://localhost:5173/5ac8375f-f495-48fa-8deb-8823fc12ff34"
                        }
                    Enhanced Query:
                        Generate a smart-styled YouTube thumbnail in the Gaming category, focusing on Valorant. Use a clean yet bold design that emphasizes competitive 
                        gaming while staying professional. Highlight the Valorant game visuals as the centerpiece, especially iconic elements such as agents, weapons, 
                        or logo. Keep the layout minimal but eye-catching, with sharp typography and smart color contrast to ensure readability at small sizes. 
                        The thumbnail should convey excitement and professionalism, optimized for YouTube’s format to attract gamers and esports fans. Ensure the 
                        design feels polished and trendy, aligning with modern gaming content aesthetics.

                    2. User_payload:
                        {
                            "category": "Tech",
                            "customCategory": "",
                            "platform": "linkedin",
                            "focus": "AI-powered laptop",
                            "style": "professional",
                            "addons": "Include subtle futuristic blue accents",
                            "image": "blob:http://localhost:5173/1a2d8c1f-8b7c-46e1-91a0-cc1f2f2de78d"
                        }
                    Enhanced Query:
                        Create a professional LinkedIn thumbnail in the Tech category, focusing on an AI-powered laptop. The design should highlight the laptop as the
                        main object, presented with sleek lighting and subtle reflections to enhance its premium look. Apply a modern professional styling, with subtle 
                        futuristic blue accents that suggest innovation and AI. Use a clean layout with minimal but impactful typography, suitable for LinkedIn’s 
                        corporate audience. Ensure the thumbnail communicates sophistication and cutting-edge technology while staying visually engaging and professional.
                ` },
            {
                role: "user",
                content: query,
            },
        ],
    });

    const result = JSON.parse(response.choices[0].message?.content);
    console.log(response, '\n\n\n', result);
}