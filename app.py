from flask import Flask, render_template, url_for, request, redirect, flash, session, jsonify, Response, json, send_file, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from models import db, User, Project, Vote, Comment, Downvote
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
from forms import RegistrationForm, LoginForm, CommentForm  # Import CommentForm
from random import randint
from urllib.parse import quote, unquote
from markupsafe import Markup
from twilio.rest import Client
import logging
import shutil
from pathlib import Path
import os
import random
import string
import json
import zipfile

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
# Define the UPLOAD_FOLDER
app.config['UPLOAD_FOLDER'] = 'static/usersubmissions'  # Specify the folder where uploaded files will be saved

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

def zip_user_submissions():
    try:
        # Path for the directory to be zipped
        directory_to_zip = Path(app.root_path, 'static', 'usersubmissions')

        # Path for the zip file
        zip_path = Path(app.root_path, 'static', 'usersubmissions.zip')

        # Check if directory exists and has files
        if directory_to_zip.is_dir() and any(directory_to_zip.iterdir()):
            # Create a zip file
            shutil.make_archive(zip_path.stem, 'zip', directory_to_zip.parent, directory_to_zip.name)
            logging.debug("Zip file created at: %s", zip_path)
            return zip_path
        else:
            logging.debug("No directory or files to zip")
            return None
    except Exception as e:
        logging.error("Error creating zip file: %s", e)
        return None




@app.route('/download_images')
def download_images():
    try:
        zip_path = zip_user_submissions()
        if zip_path and zip_path.is_file():
            # Provide the full path to the file for direct download
            full_path = zip_path.resolve()

            # Create a JavaScript snippet to initiate the download
            download_script = f'<script>window.location.href = "{url_for("static", filename="usersubmissions.zip")}";</script>'

            # Return the script as an HTML response
            return Response(download_script, mimetype='text/html')
        else:
            flash('No images available to download.', 'info')
            return redirect(url_for('opendata'))
    except Exception as e:
        logging.error("Error in downloading images: %s", e)
        flash('Error in downloading images.', 'danger')
        return redirect(url_for('opendata'))


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
    
@app.route('/beitraege')
def beitraege():
    return render_template('beitraege.html')
    
@app.route('/submit_project', methods=['POST'])
@login_required
def submit_project():
    if request.method == 'POST':
        name = request.form.get('title')
        description = request.form.get('description')
        image = request.files.get('image')
        category = request.form.get('category')

        # Check if an image file was uploaded
        if image:
            # Generate a unique filename for the uploaded image
            image_filename = secure_filename(image.filename)
            image.save(os.path.join(app.config['UPLOAD_FOLDER'], image_filename))  # Save the image to the specified folder

            # Create a new project record in the database
            new_project = Project(name=name, description=description, image_file=image_filename, category=category, author=current_user.id)
              # Save the project and add a debug log
            db.session.add(new_project)
            db.session.commit()
            logging.debug(f"Project '{name}' submitted by user {current_user.id}")

            # Use flash to send a success message
            flash('Success! The project has been successfully submitted.', 'success')
            return redirect(url_for('index'))
        else:
            flash('Please upload an image for your project.', 'danger')
            return redirect(url_for('index'))

    return render_template('submit_project.html')

@app.route('/list')
def list_view():
    query = Project.query

    # Get parameters
    category = request.args.get('category')
    age = request.args.get('age')
    score = request.args.get('score')
    search = request.args.get('search')

    # Apply filters
    if category:
        query = query.filter(Project.category == category)
    if search:
        query = query.filter(Project.name.contains(search))
    if age == 'newest':
        query = query.order_by(Project.date.desc())
    elif age == 'oldest':
        query = query.order_by(Project.date)

    # Here, you need to fill in the logic for 'highest' and 'lowest' scores
    if score == 'highest':
        # Add logic to sort by highest score
        pass  # Replace 'pass' with your logic
    elif score == 'lowest':
        # Add logic to sort by lowest score
        pass  # Replace 'pass' with your logic

    projects = query.all()
    return render_template('list.html', projects=projects)


    
@app.route('/downvote/<int:project_id>', methods=['POST'])
@login_required
def downvote(project_id):
    project = Project.query.get_or_404(project_id)
    existing_downvote = Downvote.query.filter_by(user_id=current_user.id, project_id=project.id).first()

    if existing_downvote:
        flash('You have already downvoted this project.', 'info')
        return redirect(url_for('list_view'))

    downvote = Downvote(user_id=current_user.id, project_id=project.id, ip_address=request.remote_addr)
    db.session.add(downvote)
    db.session.commit()
    flash('Your downvote has been recorded!', 'success')
    return redirect(url_for('list_view'))

@app.route('/comment/<int:project_id>', methods=['POST'])
@login_required
def comment(project_id):
    project = Project.query.get_or_404(project_id)
    comment_text = request.form.get('comment')
    
    # Create a new Comment instance
    new_comment = Comment(text=comment_text, user_id=current_user.id, project_id=project_id)
    
    # Add and commit the new comment to the database
    db.session.add(new_comment)
    db.session.commit()
    
    flash('Your comment has been posted!', 'success')
    return redirect(url_for('list_view'))

@app.route('/opendata')
def opendata():
    # Additional logic can be added here if needed
    return render_template('opendata.html')


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


@app.route('/download_data')
def download_data():
    # Querying data from the database
    projects = Project.query.all()
    votes = Vote.query.all()
    comments = Comment.query.all()
    downvotes = Downvote.query.all()

    # Converting data to JSON format
    data = {
        "projects": [project.to_dict() for project in projects],
        "votes": [vote.to_dict() for vote in votes],
        "comments": [comment.to_dict() for comment in comments],
        "downvotes": [downvote.to_dict() for downvote in downvotes]
    }

    # Creating a response with the JSON data
    response = Response(
        json.dumps(data, default=str),
        mimetype='application/json',
        headers={'Content-Disposition': 'attachment;filename=data.json'}
    )

       # Create a zip file of user submissions
    zip_path = zip_user_submissions()

    if zip_path and zip_path.is_file():
        data['image_zip_file'] = url_for('static', filename='usersubmissions.zip')
    else:
        data['image_zip_file'] = "No images available to download"

    # Create JSON response
    response = Response(
        json.dumps(data, default=str),
        mimetype='application/json',
        headers={'Content-Disposition': 'attachment;filename=data.json'}
    )

    return response

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

@app.route('/project/<int:project_id>')
def project_view(project_id):
    project = Project.query.get_or_404(project_id)
    projects = Project.query.all()
    return render_template('list.html', projects=projects, active_project=project)


if __name__ == "__main__":
    app.run(debug=True)
