# Omnidocs SharePoint Connector Example

This repository provides a complete example of an Omnidocs SharePoint connector. It allows users to initiate document generation through Omnidocs and save the generated files directly to SharePoint document libraries. This README includes all instructions needed for installation, configuration, and customization.

The repository offers two methods for using the Omnidocs SharePoint Connector with the Omnidocs platform:

1. Direct Upload Method: Quickly deploy the provided .sppkg package directly to your SharePoint App Catalog for a straightforward installation.

2. Development and Customization Method: For more advanced use cases, this method allows you to build, customize, and compile the connector solution to modify behavior or configuration settings as needed.

Note: If you want to deploy the package to a specific site only, it is still possible, but it requires uploading the package as outlined in Method 1, without deploying it to all sites.
After uploading, navigate to the Site Contents section of the target site, click on the "Add an app" link, and select the "omnidocs-app-flow-sharepoint" app to add it.
For this setup to work correctly, you must build the package with the desired configuration URL preconfigured, as explained in Method 2.
---

## Folder Structure

The repository includes the following key folders and files:

- `/sharepoint-connector-example/`
  - `config/` - SPFx configuration files for the solution
    - `config.json`
    - `serve.json`
  - `sharepoint/`
    - `solution/`
      - `omnidocs-app-flow-sharepoint.sppkg` - Deployment package for SharePoint
    - `assets/` - Configuration of the command, view and type
      - `ClientSideInstance.xml` - Defines instance-specific settings, such as title and properties, for the extension.
      - `elements.xml` - Provides base configuration and registration metadata for the SharePoint extension.
  - `src/` - Main source code for the SPFx extension
    - `extensions/`
      - `omnidocsCommandSet/`
        - `OmnidocsCommandSetCommandSet.ts` - Main extension logic
        - `loc/` - Localization files (optional)
          - `en-us.js`
  - `gulpfile.js` - Build tasks for development and deployment
  - `package.json` - Dependencies and build scripts
  - `tsconfig.json` - TypeScript compiler configuration
  - `.yo-rc.json` - SPFx generator settings
  - `.gitignore` - Exclusions for version control


## Prerequisites

1. SharePoint Framework (SPFx) installed for building and deploying the extension.
2. Node.js installed for managing dependencies and running SPFx commands.
3. SharePoint App Catalog Access: Access to the App Catalog in your SharePoint tenant to upload the solution package.


## Method 1: Direct Upload and Deployment to all sites
This method uses the prebuilt omnidocs-app-flow-sharepoint.sppkg file, included in this package, for quick deployment.

1. Locate the Package:
   * Navigate to the sharepoint/solution folder within this repository.
   * Locate the omnidocs-app-flow-sharepoint.sppkg file, which is ready for deployment.
2. Upload to the SharePoint App Catalog:
   * Open the SharePoint Admin Center and go to Apps > App Catalog.
   * In the App Catalog, select Apps for SharePoint.
   * Click Upload and select the omnidocs-app-flow-sharepoint.sppkg file.
3. Deployment Options:
   * After uploading, a prompt will ask if you want to Make this solution available to all sites in the organization.
   * Choose one of the following deployment options:
      Tenant-Wide Deployment: Allows the connector to be available across all SharePoint sites automatically.
      Site-Specific Deployment: Deploy the connector to individual sites by following these steps:
         Go to the target site.
         Navigate to Site Contents > Add an app.
         Locate and add the Omnidocs App Flow SharePoint connector.

## Method 2: Development and Customization
This method is ideal if you want to modify the connector code or configuration settings before deployment.

1. Clone the Repository:
   Clone the repository to your local machine:
   git clone https://github.com/Omnidocs/AppFlow
   cd AppFlow/examples/sharepoint-connector-example

2. Install Dependencies:
   Install all necessary packages and dependencies:
   npm install

3. Modify Files (Optional):
   If you wish to customize the code, open src/extensions/omnidocsCommandSet/OmnidocsCommandSetCommandSet.ts in a code editor.
   You can adjust the configurationURL, modify form data handling, or add SharePoint data retrieval logic. 

4. Build and Package the Solution:
   gulp build
   gulp bundle --ship
   gulp package-solution --ship

5. Upload the Generated Package:
   The new package can be found in sharepoint/solution/.
   Upload the newly generated .sppkg file to the SharePoint App Catalog, as described in Direct Upload Method above.

Note: If you choose to deploy the package to a specific site only, make sure to update the configurationURL in the following files:
    - OmnidocsCommandSetCommandSet.manifest.json
    - ClientSideInstance.xml
    - elements.xml
After making these changes, rebuild the package as outlined in Step 4.

## Configuration and Customization Options

The configurationURL can be modified for tenant-wide deployments. To adjust this:
1. Go to the SharePoint Admin Center.
2. Navigate to Tenant-Wide Extensions and locate the Omnidocs SharePoint Connector.
3. Edit the configurationURL property for specific document generation needs or endpoint changes.

Adding the Connector to Additional Sites
If tenant-wide deployment is not enabled, follow these steps to add the connector to additional sites:
1. Go to Site Contents of the target site.
2. Select Add an app and locate the Omnidocs connector to enable it.

## Data Exchange and SharePoint Context
The connector exchanges SharePoint context data (current list and user information) with the Omnidocs platform to dynamically generate documents. The connector can be expanded to fetch additional SharePoint-specific data if needed for custom scenarios.

For developers, the main logic is in OmnidocsCommandSetCommandSet.ts, where:
1. Form Components received from Omnidocs can be sent back as needed.
2. SharePoint Context Data such as current list details and user context is included in responses.

## Summary of Files for Distribution
To support both direct deployment and custom development, ensure the following files are included in the repository:

1. Deployment Package: sharepoint/solution/omnidocs-app-flow-sharepoint.sppkg for direct upload.
2. Source Code: Include the entire src directory for customization.
3. Configuration Files:
   gulpfile.js for building the solution.
   config/ folder for SPFx settings.
   sharepoint/assets/ for any resources like icons or custom styles (e.g., oblack.svg icon).

For full deployment, ensure that developers have access to build commands via npm install, gulp build, and gulp package-solution --ship.