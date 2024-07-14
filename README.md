A software with the following:
- Can display a localhost website in a frame
- Can modify the contents in the frame
- Show components outside the displayed website (like a sidebar)
- Read/write files


Remaining tasks:
[x] Integrate existing component modification with endpoint
[x] Addition of new component
- [x] Generates the component and style for the new component
- [x] Add the new component to the existing component
[x] Module search frontend and backend
[x] Prettify CSS
[ ] Make presentation & video
[ ] Write documentation

This is a starter react template.
And this is typically how your development environment looks like (show vscode side by side with web browser). You make a change in your code and it reflects immediately on the UI. 

Now let me spin our integrated environment. Now theres a few key differences between the development processes.

We have a floating window that appears on top of our React environment. 

I’m going to copy paste our project_dir for the project we want to edit. 

And you can now hover over the different elements to see them better. In addition, you can click them and you can see the corresponding React code.

Here we just have one component, which is the App.tsx.

Let’s say I want to add a new component. I’m going to add a Greeting component that says hello world. Now in the old development process, I’d have to create a new file, css, and add all the code manually. In this version, I can just say, 
*add a new component called the greeting component that says "Hello World"*

And lets see what it does. It adds the files, and makes the necessary edits. We have a new component called the GreetingComponent.

Perfect. We can hover over this new component, click it and see the code. Let's publish this component to our vector database. This means that we can now access it at any point if we need. And we can always use the search in case we have too many components.

Let's make some more changes. I want this page to be an email sign up page.
*change the component to be an email sign up page*

Perfect.

We can test our app in mobile, tablet or pc view to make sure the styling is correct. 



