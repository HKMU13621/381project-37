# COMP S381F Group Project
Project Topic : Music Playlist Management System  
Group No : 42  
Group Member ：  
- Lo Po Ming (13629178)
- Ng Chin Wa (13595298)
- Mok Tsz Lam (13557386)
- Yu Ho Ching Washington(13712631)


# Audio Manager Application

## Project Overview

This project is an audio management web application that allows users to upload, edit, and manage audio files. Users can log in using social media platforms such as Google or Facebook, and easily navigate through functionalities like viewing metadata, editing, and managing uploaded audio files. The application is built with Node.js, Express, MongoDB, and other supporting libraries, and it is hosted on AWS Lightsail using Docker for scalability and flexibility.


### Project URL

[https://atcitybot.com](https://atcitybot.com)

---

## File and Folder Structure

### `server.js`
The main entry point of the application, is responsible for the following:
- Managing routes and handling API requests.
- Returning JSON-formatted data objects based on user input.
- Integrating core application logic to route API requests to the correct handling functions and provide appropriate data responses.

### `package.json`
Contains the list of dependencies required to run the application:
- **Core Modules**: 
  - `express` - Server framework for managing HTTP requests.
  - `express-formidable` - Middleware to parse form data.
  - `express-session` - Session management.
  - `mongoose` and `mongodb` - For database interactions.
- **Authentication**: 
  - `passport`, `passport-local`, `passport-google-oauth20`, `passport-facebook` - Authentication and social login strategies.
- **Utilities**: 
  - `dotenv` - To manage environment variables.
  - `node-fetch` - HTTP client.
  - `fluent-ffmpeg` - Audio file processing.
- **Development Tools**: 
  - `ejs` - Template engine for rendering views.
  - `nodemon` - Live-reloading for development.

### `uploads/*`
This folder contains all the uploaded audio and images files.

### `views/*`
Contains all EJS templates used for rendering the front-end:
- **`create.ejs`**: Upload new audio files.
- **`details.ejs`**: View detailed information about an audio file, including metadata and available actions.
- **`edit.ejs`**: Edit the audio files.
- **`info.ejs`**: Displays user login method and ID.
- **`list.ejs`**: Manage and display a list of uploaded audio files.
- **`login.ejs`**: User login page with Facebook and Google options.

### `models/*`
Contains data models for MongoDB:
- **`audioModel.js`**: Defines the schema for audio files, including attributes like format, bit rate, duration, and volume parameters.

### `lib/*`
Contains utility libraries:
- **`mongodbHandler.js`**: Provides methods to interact with MongoDB, simplifying operations like insert, update, delete, and query.

---

## Getting Started

### Prerequisites
Ensure that you have Node.js and npm installed.

### Install Dependencies
To install the necessary dependencies, run the following command:
```sh
npm install
```

### Running the Application
- **Development Mode (with Nodemon)**:
  ```sh
  npm run dev
  ```
- **Production Mode**:
  ```sh
  npm start
  ```

---

## Deployment Details
The application is deployed using **AWS Lightsail** and **Docker**, offering the following benefits:
- **Scalability**: AWS Lightsail and Docker enable easy scaling of resources to handle fluctuating traffic demands.
- **Reliability**: The AWS infrastructure provides stable performance and high availability.
- **Cost-Efficiency**: The server setup is designed to keep operational costs low while delivering reliable system performance.

---

## Usage Guide
1. **Login**: Users can log in via Facebook or Google using the login page (`login.ejs`).
2. **Upload Audio Files**: Navigate to the upload page to add new audio files to the system (`create.ejs`).
3. **Manage Audio Files**: Uploaded audio files can be viewed, edited, and managed through the list and details views (`list.ejs`, `details.ejs`). All uploaded files are publicly viewable.

---

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.
