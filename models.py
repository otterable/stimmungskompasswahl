from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    surname = db.Column(db.String(100), nullable=False)
    
    ip_address = db.Column(db.String(100))  # Assuming you'll set this at registration
    highlight_id = db.Column(db.Integer)  # Assuming this is an integer field
    account_creation = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    descriptionwhy = db.Column(db.String(300), nullable=False)  # Why the project is suggested
    public_benefit = db.Column(db.String(300), nullable=False)  # How the public will benefit
    image_file = db.Column(db.String(100), nullable=False)  # Path to the image file
    geoloc = db.Column(db.String(100))  # Geolocation data (optional)
    date = db.Column(db.DateTime, default=datetime.utcnow)  # Date of project creation
    author = db.Column(db.String(100), nullable=False)  # Author of the project

    # Relationships
    votes = db.relationship('Vote', backref='project', lazy=True)
    comments = db.relationship('Comment', backref='project', lazy=True)


    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "descriptionwhy": self.descriptionwhy,
            "public_benefit": self.public_benefit,
            "image_file": self.image_file,
            "geoloc": self.geoloc,
            "date": self.date.strftime("%Y-%m-%d %H:%M:%S") if self.date else None,
            "author": self.author
        }

class Vote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    upvote = db.Column(db.Boolean, default=False)  # Indicates if it's an upvote
    downvote = db.Column(db.Boolean, default=False)  # Indicates if it's a downvote

    
    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "upvote": self.upvote,
            "downvote": self.downvote
        }
        
class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(300), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }