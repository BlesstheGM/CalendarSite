<p align="center">
  <a href="" rel="noopener">
 <img width=200px height=200px src="https://cdn-icons-png.flaticon.com/512/747/747310.png" alt="Project logo"></a>
</p>

<h3 align="center">CalendarSite</h3>

---

<p align="center">  
A full-stack event calendar application with RSVP functionality and guest email invitations.
    <br>  
</p>

## 📝 Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Deployment](#deployment)
- [Built Using](#built_using)
- [Authors](#authors)
- [Acknowledgments](#acknowledgement)

## 🧐 About <a name = "about"></a>

This project is a **full-stack calendar & RSVP system** that allows users to:
- Create events with details (title, date, time, location, description).
- Invite guests via email.
- Automatically generate RSVP links for events.
- Guests can respond via the RSVP page.
- Sends confirmation emails and stores a local HTML copy of the RSVP confirmation.


It’s built with **FastAPI** (Python) for the backend, **JavaScript** for dynamic frontend behavior, and **SQLite** as the database.

---


### Prerequisites

You need to have installed:

- Python 3
- pip (Python package installer)


## 🏁 Getting Started <a name = "getting_started"></a>

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See [deployment](#deployment) for notes on how to deploy the project on a live system.




## 🚀 Deployment <a name = "deployment"></a>

git clone the project
Or just make sure all your project files (main.py, index.html, rsvp.html, styles/, js/, etc.) are in one folder.

run<br> 
"pip install -r requirements.txt"

In the .env fie set the below with your configuration:<br>
SMTP_USER=your.email@gmail.com<br>
SMTP_PASS=your_app_password_here<br>
BASE_URL=http://127.0.0.1:8000

For Gmail you need to generate an App Password (if using 2FA) and use that as SMTP_PASS.

Run the backend server
<br>
"uvicorn main:app --reload"

Open in browser
<br>
Calendar UI: http://127.0.0.1:8000


## ⛏️ Built Using <a name = "built_using"></a>

- FastAPI – Backend framework for building APIs
- SQLite – Lightweight database
- SQLAlchemy – ORM (Object-Relational Mapper) for database interaction
- Pydantic – Data validation and serialization
- Uvicorn – ASGI server for running FastAPI
- JavaScript (Vanilla JS) – Frontend interactivity
- HTML5 – Structure of the web pages
- CSS3 – Styling for the UI
- Python dotenv – For loading environment variables from .env
- Email Validator – For validating email inputs


## ✍️ Authors <a name = "authors"></a>

- Blessing Hlongwane


## 🎉 Acknowledgements <a name = "acknowledgement"></a>

- FastAPI Documentation 
- Gmail SMTP for email services.
- Inspiration from https://calendarlink.com/
- This project was developed with assistance from ChatGPT by OpenAI for brainstorming, coding guidance, and debugging help.
ChatGPT was used as a collaborative tool to speed up development, explain code concepts, and help design features.
- ReadMe generator on vsCode