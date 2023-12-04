from flask import Flask, render_template, url_for, request, redirect, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from models import db, User, Project, Vote, Comment
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from forms import RegistrationForm, LoginForm
from random import randint
from urllib.parse import quote, unquote
from markupsafe import Markup
from twilio.rest import Client
import logging
import os
import random
import string

from dotenv import load_dotenv
load_dotenv()

# Twilio credentials
account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
twilio_number = os.environ.get('TWILIO_PHONE_NUMBER')

print("Twilio Account SID:", account_sid)
print("Twilio Auth Token:", auth_token)
print("Twilio Phone Number:", twilio_number)


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

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))


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


def calculate_age(dob):
    today = datetime.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))





@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        print(request.form)  # Debug: print form data
        phone_number = request.form.get('phone_number')  # Use .get() for safer access
        email = request.form['email']
        password = request.form['password']
        name = request.form['name']
        surname = request.form['surname']
        street = request.form['street']
        town = request.form['town']
        plz = request.form['plz']
        bundesland = request.form['bundesland']
        ip_address = request.remote_addr  # Capture IP address from request

        # Check for existing user with the same phone number or email
        existing_user = User.query.filter((User.phone_number == phone_number) | (User.email == email)).first()
        if existing_user:
            flash('An account with this phone number or email already exists.', 'danger')
            return jsonify({'success': False, 'message': 'User already exists'}), 400

        # Generate OTP and handle verification
        otp = randint(100000, 999999)
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=f"Your OTP is: {otp}",
            from_=twilio_number,
            to=request.form.get('phone_number')
        )
        logging.debug(f"Twilio message SID: {message.sid}")

        # Save the user data in session temporarily
        session['user_data'] = {
            'phone_number': phone_number,
            'email': email,
            'password': password,
            'name': name,
            'surname': surname,
            'street': street,
            'town': town,
            'plz': plz,
            'bundesland': bundesland,
            'ip_address': ip_address,
            'otp': otp
        }

        logging.debug("User registered, OTP sent for verification")
        return jsonify({'success': True, 'message': 'OTP sent successfully'})
        return redirect(url_for('verify_otp'))

    return render_template('register.html')


def generate_otp_and_send(phone_number):
    otp = randint(100000, 999999)
    client = Client(account_sid, auth_token)
    try:
        message = client.messages.create(
            body=f"Your OTP is: {otp}",
            from_=twilio_number,
            to=phone_number
        )
        logging.debug(f"OTP sent: {message.sid}")
    except Exception as e:
        logging.error(f"Error sending OTP: {e}")
        return None
    return otp

@app.route('/request_otp', methods=['POST'])
def request_otp():
    phone_number = request.form.get('phone_number')
    user = User.query.filter_by(phone_number=phone_number).first()
    if user:
        otp = generate_otp_and_send(phone_number)
        if otp:
            session['reset_otp'] = otp
            session['phone_number'] = phone_number
            logging.debug(f"OTP generated and session updated for phone number {phone_number}")
            return jsonify(success=True, message="OTP sent to your phone.")
        else:
            return jsonify(success=False, message="Failed to send OTP.")
    return jsonify(success=False, message="Phone number not found.")

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    if request.method == 'POST':
        otp_entered = request.form.get('otp')
        new_password = request.form.get('new_password')
        phone_number = session.get('phone_number')
        if 'reset_otp' in session and session['reset_otp'] == int(otp_entered):
            user = User.query.filter_by(phone_number=phone_number).first()
            if user:
                user.set_password(new_password)
                db.session.commit()
                logging.debug(f"Password reset for user with phone number {phone_number}")
                flash('Your password has been reset successfully.', 'success')
                return redirect(url_for('login'))
            else:
                flash('Invalid phone number.', 'danger')
        else:
            flash('Invalid OTP. Please try again.', 'danger')
    return render_template('reset_password.html')
    

@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    if request.method == 'POST':
        user_otp = request.form['otp']
        if 'user_data' in session and session['user_data']['otp'] == int(user_otp):
            user_data = session.pop('user_data')
            new_user = User(
                phone_number=user_data['phone_number'],
                email=user_data['email'],
                password_hash=generate_password_hash(user_data['password']),
                name=user_data['name'],
                surname=user_data['surname'],
                street=user_data['street'],
                town=user_data['town'],
                plz=user_data['plz'],
                bundesland=user_data['bundesland'],
                ip_address=user_data['ip_address']
            )
            db.session.add(new_user)
            db.session.commit()

            # Log in the user automatically
            login_user(new_user)

            return jsonify({'success': True, 'message': 'Account successfully created'})
        else:
            return jsonify({'success': False, 'message': 'Invalid OTP'}), 400

    return render_template('verify_otp.html')




@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))



@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username_or_phone = request.form.get('username_or_phone')
        password = request.form.get('password')

             # Adjust the filter to match the fields in your User model
        user = User.query.filter((User.phone_number == username_or_phone) | (User.email == username_or_phone)).first()


        if user and user.check_password(password):
            login_user(user)
            logging.debug("Login successful")
            flash('Login successful!', 'success')
            return jsonify(success=True)
        else:
            logging.debug("Login failed")
            flash('Login failed - invalid credentials.', 'danger')
            return jsonify(success=False)

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
