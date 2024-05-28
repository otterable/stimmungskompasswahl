from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


# models.py
class QuestionSet(db.Model):
    __tablename__ = 'question_set'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    questions = db.relationship('QuestionSetQuestion', backref='questionset', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "questions": [question.to_dict() for question in self.questions]
        }

class QuestionSetQuestion(db.Model):
    __tablename__ = 'question_set_question'
    id = db.Column(db.Integer, primary_key=True)
    questionset_id = db.Column(db.Integer, db.ForeignKey('question_set.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    marker_color = db.Column(db.String(7), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "questionset_id": self.questionset_id,
            "title": self.title,
            "description": self.description,
            "marker_color": self.marker_color
        }

class QuestionSetAnswer(db.Model):
    __tablename__ = 'question_set_answer'
    id = db.Column(db.Integer, primary_key=True)
    questionset_id = db.Column(db.Integer, db.ForeignKey('question_set.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question_set_question.id'), nullable=False)
    answer_text = db.Column(db.Text, nullable=False)
    answer_time = db.Column(db.DateTime, default=datetime.utcnow)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    author_id = db.Column(db.Integer, nullable=True)

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


class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date_posted = db.Column(db.DateTime, default=datetime.utcnow)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    image_file = db.Column(db.String(20), nullable=True)  # New attribute for image file name
    views = db.Column(db.Integer, default=0)  # New attribute to track views

    def __repr__(self):
        return f"Post('{self.title}', '{self.date_posted}')"
        
class ProjectView(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    ip_address = db.Column(db.String(100))
    last_viewed = db.Column(db.DateTime)

class Bookmark(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "project_id": self.project_id,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }

class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

   
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
    is_featured = db.Column(db.Boolean, default=False)
    is_mapobject = db.Column(db.String(20), default='')  # Change to String
    is_global = db.Column(db.Boolean, default=False)
    view_count = db.Column(db.Integer, default=0)

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
            "view_count": self.view_count,
            "is_featured": self.is_featured,
            "is_mapobject": self.is_mapobject  # Include new field
        }


class WebsiteViews(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    view_date = db.Column(db.Date, nullable=False)
    ip_address = db.Column(db.String(100), nullable=False)

    @classmethod
    def add_view(cls, ip_address):
        today = date.today()
        existing_view = cls.query.filter_by(view_date=today, ip_address=ip_address).first()
        if not existing_view:
            new_view = cls(view_date=today, ip_address=ip_address)
            db.session.add(new_view)
            db.session.commit()


class Baustelle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(300), nullable=True)
    gis_data = db.Column(db.JSON)  # Storing GeoJSON data
    gisfile = db.Column(db.String(20), nullable=True)  # Storing GeoJSON data
    author = db.Column(db.String(100), nullable=True)  # Optional author name
    date = db.Column(db.DateTime, default=datetime.utcnow)
    questions = db.relationship('Question', backref='baustelle', lazy=True, cascade="all, delete-orphan")
    image = db.Column(db.String(300), nullable=True)  # Path to the image in static/baustellepics

    def __repr__(self):
        return f'<Baustelle {self.name}>'


class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(300), nullable=False)
    author = db.Column(db.String(100), nullable=True)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    answer_text = db.Column(db.String(300), nullable=True)
    answered = db.Column(db.Boolean, default=False)
    baustelle_id = db.Column(db.Integer, db.ForeignKey('baustelle.id'), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    answer_date = db.Column(db.DateTime)  # New field for answer date

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "author": self.author,
            "date": self.date,
            "answer_text": self.answer_text,
            "answered": self.answered,
            "baustelle_id": self.baustelle_id,
            "longitude": self.longitude,
            "latitude": self.latitude,
            "answer_date": self.answer_date
        }

    def __repr__(self):
        return f'<Question {self.id}>'



class GeoJSONFeature(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    feature_id = db.Column(db.String(100), nullable=False)  # Unique ID of the feature within the GeoJSON data
    description = db.Column(db.String(300), nullable=True)  # Custom description
    baustelle_id = db.Column(db.Integer, db.ForeignKey('baustelle.id'), nullable=False)
    baustelle = db.relationship('Baustelle', backref=db.backref('features', lazy=True))



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