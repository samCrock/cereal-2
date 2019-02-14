![Cereal Background]('src/assets/cereal-bkg.png')
<!-- 
[![Travis Build Status][build-badge]][build]
[![Dependencies Status][dependencyci-badge]][dependencyci]
[![Make a pull request][prs-badge]][prs]
[![License](http://img.shields.io/badge/Licence-MIT-brightgreen.svg)](LICENSE.md)

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]
 -->
## Getting Started

Clone this repository locally :

``` bash
git clone https://github.com/samCrock/cereal-2.git
```

Install dependencies with npm :

``` bash
npm install
```

## To build for development

- **in a terminal window** -> npm run start  

``` bash
npm install --save-dev electron-rebuild

# Every time you run "npm install", run this
./node_modules/.bin/electron-rebuild

# On Windows if you have trouble, try:
.\node_modules\.bin\electron-rebuild.cmd
```

## Deploy steps

* Commit changes
* Bump version ``` npm run pre-deploy  ```  
* Build ``` npm run electron:windows  ```
* Move generated exe from ``` app-build ``` to another folder and rename it as 'Cereal_setup.exe'  
* ``` npm checkout win-build ```
* Replace previously saved 'Cereal_setup.exe' to current folder
* Commit update and checkout back to master branch 
