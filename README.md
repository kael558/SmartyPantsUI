# Smarty Pants UI

<a name="readme-top"></a>

[![MIT License][license-shield]][license-url]

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#-what-is-this">What is this?</a></li>
    <li>
      <a href="#-getting-started">Getting Started</a>
      <ul>
        <li><a href="#-quick-install">Quick Install</a></li>
        <li><a href="#-run-the-langflows">Run the Langflows</a></li>
        <li><a href="#-running-a-local-development-server">Running a Local Development Server</a></li>
        <li><a href="#-start-up-the-development-environment">Start up the Development Environment</a></li>
      </ul>
    </li>
    <li><a href="#-roadmap">Roadmap</a></li>
    <li><a href="#-contributing">Contributing</a></li>
    <li><a href="#-license">License</a></li>
  </ol>
</details>



## 🤔 What is this?
An integrated development environment to speed up front-end development.

A user can view their development server through the development environment to gain access to features.

## 📖 Getting Started 
### ⚡️ Quick Install
Clone the project to your desired folder with:
`git clone https://github.com/kael558/SmartyPantsUI.git`

### ⛓️ Run the Langflows
Download the 4 langflows and populate the API keys/applications secrets.

These are now an API that you can call from your local machine.

### 🤖 Running a Local Development Server
Navigate to the templates folder and open 'my-app' for a good first example. 

Make sure to run `npm i` and then `npm start` to spin up the local development server.

### 📁 Start up the Development Environment
Navigate back to the root of the project.

Do the same and run `npm i` and then `npm start` 

Copy your path from the Local Development Server and paste it in the project_dir, so that the environment knows where the files are. 

By this point you should have:
- Langflow running with 4 langflow endpoints
- A local development server running the React starter template
- The development environment

The current main features in the Development Environment are:
- Clicking on the UI and seeing the retrieved source code. You can make edits and save that code to see live updates in the UI.
- After a component is selected, you may type in the text input and:
  - Request an edit (e.g., changing the text/styling) and then clicking 'Edit'
  - Add a new component (e.g., add a Greeting component that says "Hello world") and then clicking 'Add New' which will create new component files
- You may publish a component so it is saved in the vector database and accessible by search. The purpose of this is:
  - So a user can easily select and find components in their project
  - It is also for a future feature to allow re-use of existing components instead of always creating new ones


<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 📅 Roadmap
- [x] Initial POC
- [ ] Fix the fact that stylesheet is sometimes not included
- [ ] Extra instructions
- [ ] Add open dev tools
- [ ] Add reload and url input
- [ ] Add ACE editor
- [ ] 
- [ ] Project aware styling
- [ ] Handling re-use of components
- [ ] Expanding frameworks to include others (like next.js)

## 🤝 Contributing
You may fork the project and work in your own repository.

## ⚖️ License
Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[license-shield]: https://img.shields.io/github/license/kael558/SmartyPantsUI.svg?style=for-the-badge
[license-url]: https://github.com/kael558/SmartyPantsUI/blob/main/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[rahel-linkedin-url]: https://www.linkedin.com/in/rahelgunaratne/
