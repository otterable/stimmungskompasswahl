from flask import Flask, render_template, url_for, request, redirect, flash, session
from flask_sqlalchemy import SQLAlchemy
from models import db, User, Project, Vote, Comment
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from forms import RegistrationForm, LoginForm
from random import randint
from urllib.parse import quote, unquote
from markupsafe import Markup
import logging
import os

# Initialize the Flask app
app = Flask(__name__)
app.secret_key = os.urandom(24)

# Configure the database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///project_voting.db'
db.init_app(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the database tables before the first request
def create_tables():
    db.create_all()


@app.route('/')
def index():
    projects = Project.query.all()
    for project in projects:
        project.image_file = quote(project.image_file)
    logging.debug("Projects: %s", projects)
    return render_template('index.html', projects=projects)


@app.route('/init_projects')
def init_projects():
    projects = [
        {'name': 'Road improvements', 'description': 'Project includes: xyz', 'image_file': 'road.png'},
        {'name': 'Park improvements', 'description': 'Project includes: xyz', 'image_file': 'park.png'},
        {'name': 'New train station', 'description': 'Project includes: xyz', 'image_file': 'train station.png'},
        {'name': 'New kindergarten', 'description': 'Project includes: xyz', 'image_file': 'kindergarten.png'}
    ]

    for proj in projects:
        if not Project.query.filter_by(name=proj['name']).first():
            new_project = Project(name=proj['name'], description=proj['description'], image_file=proj['image_file'])
            db.session.add(new_project)
            logging.debug("Adding project: %s", proj['name'])

    db.session.commit()
    return "Projects initialized successfully"


@app.route('/download/<filename>')
def download_file(filename):
    decoded_filename = unquote(filename)
    # Further processing with decoded_filename
    return send_from_directory(directory, decoded_filename)


@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        # Create a new user instance
        user = User(
            username=form.username.data, 
            phone_number=form.phone_number.data,
            name=form.name.data, 
            surname=form.surname.data,
            dob=form.dob.data, 
            address=form.address.data
        )
        user.set_password(form.password.data)
        db.session.add(user)

        # Generate OTP and handle verification (implementation depends on your method of sending OTP)
        otp = randint(100000, 999999)
        # Send OTP to user's phone number and handle verification

        return redirect(url_for('verify_otp'))

    return render_template('register.html', form=form)


@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    if request.method == 'POST':
        otp_entered = request.form.get('otp')
        if 'otp' in session and session['otp'] == int(otp_entered):
            user_id = session.pop('user_id')
            user = User.query.get(user_id)
            db.session.commit()
            flash('Account created successfully!', 'success')
            return redirect(url_for('login'))
        else:
            flash('Invalid OTP. Please try again.', 'danger')
    return render_template('verify_otp.html')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@app.route('/login', methods=['GET', 'POST'])
def login():
    logging.debug("Login route accessed")
    if request.method == 'POST':
        username_or_phone = request.form.get('username_or_phone')
        password = request.form.get('password')

        # Check if user exists with given username or phone number
        user = User.query.filter((User.username == username_or_phone) | 
                                 (User.phone_number == username_or_phone)).first()

        if user and user.check_password(password):
            # User exists and password matches, log the user in
            login_user(user)
            return redirect(url_for('index'))
        else:
            # User does not exist or password does not match
            flash('Invalid credentials. Please register if you do not have an account.', 'danger')
            return redirect(url_for('register'))

    return render_template('login.html')


@app.route('/vote/<int:project_id>', methods=['GET', 'POST'])
@login_required
def vote(project_id):
    project = Project.query.get_or_404(project_id)
    if request.method == 'POST':
        vote = Vote(user_id=current_user.id, project_id=project.id, ip_address=request.remote_addr)
        db.session.add(vote)
        db.session.commit()
        flash('Your vote has been recorded!', 'success')
        return redirect(url_for('index'))
    return render_template('vote.html', project=project)

@app.route('/project/<int:project_id>', methods=['GET', 'POST'])
@login_required
def project(project_id):
    project = Project.query.get_or_404(project_id)
    comments = Comment.query.filter_by(project_id=project_id).all()
    form = CommentForm()
    if form.validate_on_submit():
        comment = Comment(text=form.text.data, user_id=current_user.id, project_id=project_id)
        db.session.add(comment)
        db.session.commit()
        flash('Your comment has been posted!', 'success')
        return redirect(url_for('project', project_id=project_id))
    return render_template('project.html', project=project, comments=comments, form=form)

if __name__ == "__main__":
    app.run(debug=True)
