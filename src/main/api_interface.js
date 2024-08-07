import axios from "axios";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generate(system, messages) {
	const response = await anthropic.messages.create({
		model: "claude-3-5-sonnet-20240620",
		max_tokens: 1024,
		messages,
		system,
	});

	return response.content[0].text;
}

export const editComponentPromptBase =
	"You are a helpful assistant proficient in React and CSS. Your task is to update a given React component and its associated stylesheet based on a requested change. Please follow these instructions carefully:\n\n1. Input Details:\n- React Component File: A file containing the code of a React component written in either JSX or TSX.\n- Stylesheet: A CSS file associated with the React component.\n- Requested Change: A specific change that needs to be made to the text content in the React component.\n\n2. Output Requirements:\n- Updated React Component File: Provide the entire updated code of the React component, ensuring that the requested text change is applied.\n- Updated Stylesheet: Provide the entire updated stylesheet if there are any changes required based on the text modification.\n\n\n3. Guidelines:\n- Maintain the format (JSX or TSX) as provided in the original component file.\n- Make sure that the entire code and CSS are provided, not just the parts that were changed.\n- Use the provided separators to clearly denote the JSX and CSS files in your response.\n\n4. Example Input\n# REACT COMPONENT\n```jsx\nimport React from 'react';\nimport './Component.css';\n\n\nconst Component = () => {{ return (<div className=\"container\"><h1>Hello World!</h1></div>);}};\nexport default Component;\n```\n\n# STYLESHEET\n```css\n.container {{ text-align: center; color: blue; }}\n```\n\n# REQUESTED CHANGE\nChange the heading text from \"Hello, World!\" to \"Welcome to React!\".\n\n\n5. Example Output\n# UPDATED REACT COMPONENT\n```jsx\nimport React from 'react';\nimport './Component.css';\n\nconst Component = () => {{ return (<div className=\"container\"><h1>Welcome to React!</h1></div>);}};\n\nexport default Component;\n```\n\n# UPDATED STYLESHEET\n```css\n.container {{ text-align: center; color: blue;}}\n```\n\n6. Input\n# REACT COMPONENT\n```jsx\n{component}\n```\n\n# STYLESHEET\n```css\n{stylesheet}\n```\n\n# REQUESTED CHANGE\n\n\n";

export async function editComponent(
	description,
	component,
	stylesheet = "No stylesheet provided",
	prompt
) {
	const system_message = prompt.replace("{component}", component).replace("{stylesheet}", stylesheet);

	const messages = [
		{
			role: "user",
			content: description,
		},
	];

	return await generate(system_message, messages);
}

export const newComponentPromptBase =
	"1. **Input Details:**\n   - Component Name: The name of the React component\n   - Component Request: The specifications of the React component\n\n2. **Output Requirements:**\n   - Component Name: The name of the React component\n   - React Component File: Provide the entire updated code of the React component, ensuring that the component matches the request.\n   - Stylesheet: Provide the entire updated stylesheet if there are any styling requirements specified in the component request.\n\n3. **Guidelines:**\n   - Write in JSX format.\n   - Ensure that the entire code and CSS are provided, not just the parts that were changed.\n   - Use the provided separators to clearly denote the JSX and CSS files in your response.\n\n4. **Example Input**\n   - **Component Name**: GreetingComponent\n   - **Component Request**: Create a React component with a heading that says \"Hello, World!\" and a blue centered text style.\n\n5. **Example Output**\n   - ** REACT COMPONENT NAME**\n```plaintext\nGreetingComponent\n```\n\n   - **REACT COMPONENT**\n    ```jsx\nimport React from 'react';\nimport './GreetingComponent.css';\n\nconst GreetingComponent = () => {{  return (<div className=\"container\"><h1>Hello, World!</h1></div>); }};\n\nexport default GreetingComponent;\n     ```\n   - **STYLESHEET**\n     ```css\n.container {{ text-align: center; color: blue; }}\n     ```\n\n6. **Input**\n   - **Component Name**: {component_name}\n   - **Component Request**:";

export async function newComponent(description, prompt) {
	const messages = [
	
		{
			role: "user",
			content: description,
		},
	];

	return await generate(prompt, messages);
}
