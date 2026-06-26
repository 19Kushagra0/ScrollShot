This extension is built using the Plasmo framework, React, and TypeScript.

To recreate the exact build uploaded here, please follow these steps:

1. Ensure you have Node.js and Yarn installed on your system.
2. Unzip the provided source code and open a terminal in the root directory.
3. Run `yarn install` to install all dependencies.
4. Run `yarn build --target=firefox-mv3` to compile the extension for Firefox.
5. Run `yarn package --target=firefox-mv3` to generate the production zip.

The compiled, ready-to-inspect code will be located in the `build/firefox-mv3-prod` directory, and the packaged zip will be `build/firefox-mv3-prod.zip`.
