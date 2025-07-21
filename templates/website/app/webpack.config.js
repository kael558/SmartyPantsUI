const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',  // Change the entry file to TypeScript
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "public", "index.html"),
    }),
  ],
  module: {
    rules: [
        {
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: path.resolve('./src/AutoDevSupport/WrapWithHOCLoader.js')
                  },
              {
                loader: 'ts-loader'
              }
         
            ]
          },
          {
            test: /\.jsx?$/,  // Regex for js and jsx files
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env', '@babel/preset-react'],  // Presets used for transpiling
              }
            }
          },
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
          },
          {
            test: /\.svg$/,
            use: [
              {
                loader: 'file-loader',
                options: {
                  name: '[name].[ext]',
                  outputPath: 'assets/'  // Directory within the output path to put images into
                }
              }
            ]
          },
 
       
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.css', '.svg']
  },
  devServer: {
    static: path.join(__dirname, 'public'),
    compress: true,
    port: 3000
  }
};
