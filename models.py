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
    ip_address = db.Column(db.String(100))  # Optional, set at registration
    highlight_id = db.Column(db.Integer)  # Optional, assumed to be an integer
    account_creation = db.Column(db.DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False)  # New field to indicate admin status
    is_googleaccount = db.Column(db.Boolean, default=False)  # New field to indicate Google account

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    descriptionwhy = db.Column(db.String(300), nullable=False)
    public_benefit = db.Column(db.String(300), nullable=False)
    image_file = db.Column(db.String(100), nullable=False)
    geoloc = db.Column(db.String(100))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    author = db.Column(db.String(100), nullable=False)
    is_important = db.Column(db.Boolean, default=False)
    p_reports = db.Column(db.Integer, default=0)
    is_featured = db.Column(db.Boolean, default=False)  # New field
    is_mapobject = db.Column(db.Boolean, default=False)

    # Relationships
    votes = db.relationship('Vote', backref='project', lazy=True, cascade="all, delete-orphan")
    comments = db.relationship('Comment', backref='project', lazy=True, cascade="all, delete-orphan")

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
            "author": self.author,
            "is_important": self.is_important,
            "p_reports": self.p_reports,
            "is_featured": self.is_featured  # Include new field
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
    c_reports = db.Column(db.Integer, default=0)  # New field to store report counts

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "c_reports": self.c_reports  # Include the new field in the dictionary
        }