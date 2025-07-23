const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

module.exports = {
	entry: "./src/index.tsx", // Change the entry file to TypeScript
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "bundle.js",
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.join(__dirname, "public", "index.html"),
		}),
		new webpack.DefinePlugin({
			"process.env.REACT_APP_BUSINESS_API_URL": JSON.stringify(
				process.env.REACT_APP_BUSINESS_API_URL
			),
			"process.env.REACT_APP_STREAM_API_URL": JSON.stringify(
				process.env.REACT_APP_STREAM_API_URL
			),
			"process.env.REACT_APP_CHAT_API_URL": JSON.stringify(
				process.env.REACT_APP_CHAT_API_URL
			),
			"process.env.REACT_APP_REST_API_URL": JSON.stringify(
				process.env.REACT_APP_REST_API_URL
			),
		}),
	],
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: [
					{
						loader: path.resolve("./src/AutoDevSupport/WrapWithHOCLoader.js"),
					},
					{
						loader: "ts-loader",
					},
				],
			},
			{
				test: /\.jsx?$/, // Regex for js and jsx files
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["@babel/preset-env", "@babel/preset-react"], // Presets used for transpiling
					},
				},
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader", "postcss-loader"],
			},
			{
				test: /\.svg$/,
				use: [
					{
						loader: "file-loader",
						options: {
							name: "[name].[ext]",
							outputPath: "assets/", // Directory within the output path to put images into
						},
					},
				],
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js", ".jsx", ".css", ".svg"],
	},
	devServer: {
		static: path.join(__dirname, "public"),
		compress: true,
		port: 3000,
	},
};
