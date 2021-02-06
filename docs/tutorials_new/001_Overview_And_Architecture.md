# TCLI: Overview and Architecture

---
## Description
> The TIBCO Command Line Interface (TCLI) is a tool that can be run from the command line to manage your Cloud Starters and interact with the TIBCO Cloud. The tool can be used on Windows, Linux or a MAC. By entering commands on a terminal you work interactively (Questions & Answers) or directly by providing the answers inline or from a (property) file. It serves the following use cases: 

* Manage your developer environment of a Cloud Starter.
* Interact and Manage your Cloud Starter on the TIBCO Cloud.
* Support certain operations in your TIBCO Cloud Organization.
* Execute repeatable deployment, management, monitoring and testing tasks.
* Integrate with a Continuous Integration Build pipeline

---
## Prerequisites
> The TCLI works based on <a href="https://nodejs.org/en/download/" target="_blank">Node.js</a>, which can be downloaded from <a href="https://nodejs.org/en/download/" target="_blank">here</a>.
> You can check your node installation by running one of the following commands:
```console
node -v
npm -v
```
> Since a Cloud Starter is an <a href="https://angular.io/" target="_blank">Angular Application</a>, you will need the <a href="https://cli.angular.io/" target="_blank">Angular CLI.</a> After you have installed Node.js, you can install the Angular CLI with the following command:
```console
npm install -g @angular/cli
```
---
## Installation
> Use the following command to install the TCLI:
```console
npm install -g @tibco-tcstk/cloud-cli
```
> You can validate your installation by running:
```console
tcli -v
```
> This should print the version of the TCLI that you are using.

---
## Help
> When running 
