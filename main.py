import os
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Boolean,
    JSON,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv


load_dotenv()  # loads .env file if present

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000") 


if not SMTP_USER or not SMTP_PASS:
    print("WARNING: SMTP_USER or SMTP_PASS not set. Email sending will fail if used.")


DATABASE_URL = "sqlite:///./events.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    date = Column(String, nullable=False)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    all_day = Column(Boolean, default=False)
    description = Column(String, nullable=True)
    location = Column(String, nullable=True)
    organizer_email = Column(String, nullable=False)
    guest_emails = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    rsvps = relationship("RSVP", backref="event", cascade="all, delete-orphan")


class RSVP(Base):
    __tablename__ = "rsvps"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    guest_email = Column(String, index=True)
    status = Column(String)  # yes, no, maybe
    created_at = Column(DateTime(timezone=True), server_default=func.now())


Base.metadata.create_all(bind=engine)


class EventCreate(BaseModel):
    title: str
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: bool
    description: Optional[str] = None
    location: Optional[str] = None
    organizer_email: EmailStr
    guest_emails: List[EmailStr] = []


class EventOut(BaseModel):
    id: int
    title: str
    date: str
    start_time: Optional[str]
    end_time: Optional[str]
    all_day: bool
    description: Optional[str]
    location: Optional[str]
    organizer_email: EmailStr
    guest_emails: List[EmailStr]
    created_at: datetime
    rsvp_counts: dict = {}

    model_config = {"from_attributes": True}


class RSVPIn(BaseModel):
    guest_email: EmailStr
    status: str


def send_email(subject: str, body: str, to_email: str):
    if not SMTP_USER or not SMTP_PASS:
        print(f"[send_email] Missing SMTP credentials; skipping email to {to_email}")
        return

    msg = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
    except Exception as e:

        print(f"Failed to send email to {to_email}: {e}")



def save_rsvp_confirmation_html(event, guest_email, status):
    os.makedirs("rsvp_confirmations", exist_ok=True)
    link = f"{BASE_URL}/rsvp/{event.id}"

    content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <title>RSVP Confirmation</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f4f6fa;
                margin: 0;
                padding: 30px;
            }}
            .container {{
                background: white;
                max-width: 650px;
                margin: auto;
                padding: 25px 30px;
                border-radius: 10px;
                box-shadow: 0 6px 20px rgba(0,0,0,0.08);
                line-height: 1.5;
                color: #1f2d3d;
            }}
            h1 {{
                color: #2563eb;
                margin-top: 0;
            }}
            p {{
                margin: 8px 0;
            }}
            .meta {{
                background: #f1f5fe;
                padding: 12px 16px;
                border-radius: 6px;
                margin: 12px 0;
            }}
            a {{
                color: #2563eb;
                text-decoration: none;
            }}
            .footer {{
                margin-top: 20px;
                font-size: 0.9rem;
                color: #555;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Thank you for your RSVP!</h1>
            <p>Hi <strong>{guest_email}</strong>,</p>
            <p>We have recorded your response for the event:</p>
            <div class="meta">
                <p><strong>Event:</strong> {event.title}</p>
                <p><strong>Date:</strong> {event.date}</p>
                <p><strong>Time:</strong> {"All day" if event.all_day else f"{event.start_time or 'N/A'} - {event.end_time or 'N/A'}"}</p>
                <p><strong>Location:</strong> {event.location or 'N/A'}</p>
                <p><strong>Description:</strong> {event.description or 'N/A'}</p>
                <p><strong>Your RSVP status:</strong> {status.capitalize()}</p>
            </div>
            <p>You can view or update your RSVP here: <a href="{link}">{link}</a></p>
            <div class="footer">
                <p>Thank you for your response. We look forward to seeing you!</p>
            </div>
        </div>
    </body>
    </html>
    """

    sanitized_email = guest_email.replace("@", "_at_").replace(".", "_")
    filename = os.path.join("rsvp_confirmations", f"rsvp_confirmation_{event.id}_{sanitized_email}.html")
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)
    return filename


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(__file__)
app.mount("/styles", StaticFiles(directory=os.path.join(BASE_DIR, "styles")), name="styles")
app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, "js")), name="js")

@app.get("/", include_in_schema=False)
def serve_index():
    index_path = os.path.join(BASE_DIR, "index.html")
    if not os.path.isfile(index_path):
        raise HTTPException(status_code=404, detail="Frontend index.html not found")
    return FileResponse(index_path)

@app.get("/rsvp/{event_id}", include_in_schema=False)
def serve_rsvp(event_id: int):
    rsvp_path = os.path.join(BASE_DIR, "rsvp.html")
    if not os.path.isfile(rsvp_path):
        raise HTTPException(status_code=404, detail="RSVP page not found")
    return FileResponse(rsvp_path)


@app.post("/events", response_model=EventOut)
def create_event(event: EventCreate, background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        db_event = Event(
            title=event.title,
            date=event.date,
            start_time=event.start_time,
            end_time=event.end_time,
            all_day=event.all_day,
            description=event.description,
            location=event.location,
            organizer_email=str(event.organizer_email),
            guest_emails=[str(e) for e in event.guest_emails],
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        event_link = f"{BASE_URL}/rsvp/{db_event.id}"

        # Email to host
        host_body = f"""
            <h3>Your event has been created!</h3>
            <p><strong>Title:</strong> {db_event.title}</p>
            <p><strong>Date:</strong> {db_event.date}</p>
            <p><strong>RSVP Link:</strong> <a href="{event_link}">{event_link}</a></p>
            <p>Share this link with your guests to collect RSVPs.</p>
        """
        background_tasks.add_task(send_email, "Event Created", host_body, db_event.organizer_email)

        # Email to each guest
        guest_body_template = f"""
            <h3>You are invited to an event!</h3>
            <p><strong>Title:</strong> {db_event.title}</p>
            <p><strong>Date:</strong> {db_event.date}</p>
            <p><strong>Location:</strong> {db_event.location or 'N/A'}</p>
            <p><strong>Description:</strong> {db_event.description or 'N/A'}</p>
            <p>Please RSVP here: <a href="{event_link}">{event_link}</a></p>
        """
        for guest_email in db_event.guest_emails:
            background_tasks.add_task(send_email, "You're Invited!", guest_body_template, guest_email)

        return EventOut.from_orm(db_event)
    finally:
        db.close()


@app.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: int):
    db = SessionLocal()
    try:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        rsvps = db.query(RSVP).filter(RSVP.event_id == event_id).all()
        counts = {"yes": 0, "no": 0, "maybe": 0}
        for r in rsvps:
            if r.status.lower() in counts:
                counts[r.status.lower()] += 1
        event_data = EventOut.from_orm(event)
        event_data.rsvp_counts = counts
        return event_data
    finally:
        db.close()


@app.post("/events/{event_id}/rsvp")
def rsvp_event(event_id: int, rsvp: RSVPIn, background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        existing = db.query(RSVP).filter(RSVP.event_id == event_id, RSVP.guest_email == rsvp.guest_email).first()
        if existing:
            existing.status = rsvp.status
        else:
            existing = RSVP(event_id=event_id, guest_email=rsvp.guest_email, status=rsvp.status)
            db.add(existing)
        db.commit()

        # Save RSVP confirmation HTML locally
        save_rsvp_confirmation_html(event, rsvp.guest_email, rsvp.status)

        if rsvp.status.lower() == "yes":
            link = f"{BASE_URL}/rsvp/{event_id}"
            body = f"""
            <h3>Thank you for confirming your attendance!</h3>
            <p>Event: {event.title} on {event.date}</p>
            <p>Location: {event.location or 'N/A'}</p>
            <p>View or modify your RSVP here: <a href="{link}">{link}</a></p>
            """
            background_tasks.add_task(send_email, "Event RSVP Confirmation", body, rsvp.guest_email)

        return {"message": "RSVP recorded"}
    finally:
        db.close()
