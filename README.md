The Chrome extension "Website Refresher" enables users to automatically refresh specific websites at user-defined intervals.

Core Functionality: Refreshes websites based on a selected interval (e.g., every 1, 10, 20 minutes, etc.).
User Interface: A popup UI allows users to add websites they want to refresh and specify the interval for each site. Users can view and manage their list of websites, enabling or disabling refresh for each as needed.
Storage and Configuration: The extension uses Chrome's storage capabilities to save user configurations. Users can export and import their settings, allowing easy transfer between devices or browsers.
Timer Control: A timer function is integrated to manage the refresh intervals for each website. Users can start or stop these timers as required.
Dynamic Feedback: The extension provides real-time updates on the next scheduled refresh for each website. It also logs significant events for user reference.
Background Operations: Utilizing a background script (background.js), the extension manages website refresh tasks without requiring the popup to remain open.
This extension is particularly useful for those who need to keep track of frequently updated web content, such as news sites, stock prices, or social media feeds.

**Steps to Load the Extension in Chrome**

**1**.Open Chrome: Start by opening your Google Chrome browser.

Access Extensions Page:

**2**.Click on the three dots (⋮) in the upper-right corner of Chrome to open the menu.
Navigate to  Extensions. Alternatively, you can type **chrome://extensions/** into the address bar and press Enter.
Enable Developer Mode:

**3**.On the Extensions page, you'll find a toggle switch in the upper-right corner labeled “Developer mode”.
Click this toggle to turn on Developer Mode. This enables you to load unpacked extensions.
Load the Unpacked Extension:

**4**.Click on the “Load unpacked” button which appears after you enable Developer Mode.
Navigate to the folder where your extension files are located. This folder should include the manifest.json file, along with any other files (like HTML, CSS, JS) that make up your extension.
Select the entire folder (not just the individual files inside it) and click 'Open' or 'Select Folder', depending on your operating system.

![image](https://github.com/yuval-kahan/website-refresh/assets/109478340/6e26df2d-9097-4487-ab68-d03936f3b7f8)

