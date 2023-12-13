from flask import Flask, render_template, url_for, request, redirect, flash, session, jsonify, Response, json, send_file, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from models import db, User, Project, Vote, Comment
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
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
import pytz

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
migrate = Migrate(app, db)

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
            # flash('No images available to download.', 'info')
            return redirect(url_for('opendata'))
    except Exception as e:
        logging.error("Error in downloading images: %s", e)
        # flash('Error in downloading images.', 'danger')
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
        logging.debug("Registration attempt: %s", request.form)  # Debug: print form data

        phone_number = request.form.get('phone_number')
        password = request.form.get('password')
        name = request.form.get('name')
        surname = request.form.get('surname')
        street = request.form.get('street')
        town = request.form.get('town')
        plz = request.form.get('plz')
        bundesland = request.form.get('bundesland')
        ip_address = request.remote_addr  # Capture IP address from request

        # Check for existing user with the same phone number
        existing_user = User.query.filter_by(phone_number=phone_number).first()
        if existing_user:
            # flash('An account with this phone number already exists.', 'danger')
            logging.debug("Account registration failed: Phone number already exists")
            return jsonify({'success': False, 'message': 'User already exists'}), 400

        # Generate OTP and handle verification
        otp = randint(100000, 999999)
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=f"Your OTP is: {otp}",
            from_=twilio_number,
            to=phone_number
        )
        logging.debug(f"Twilio message SID: {message.sid}")

        # Save the user data in session temporarily
        session['user_data'] = {
            'phone_number': phone_number,
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

        logging.debug("OTP sent for verification to phone number: %s", phone_number)
        return jsonify({'success': True, 'message': 'OTP sent successfully'})

    return render_template('register.html')

@app.route('/get_projects')
def get_projects():
    try:
        projects = Project.query.all()
        projects_data = []
        for project in projects:
            upvotes = sum(1 for vote in project.votes if vote.upvote)
            downvotes = sum(1 for vote in project.votes if vote.downvote)
            upvote_percentage = (upvotes / (upvotes + downvotes) * 100) if (upvotes + downvotes) > 0 else 0
            downvote_percentage = (downvotes / (upvotes + downvotes) * 100) if (upvotes + downvotes) > 0 else 0

            project_data = project.to_dict()
            project_data['upvotes'] = upvotes
            project_data['downvotes'] = downvotes
            project_data['upvote_percentage'] = upvote_percentage
            project_data['downvote_percentage'] = downvote_percentage
            projects_data.append(project_data)
        return jsonify(projects_data)
    except Exception as e:
        logging.error(f"Error in get_projects: {e}")
        return jsonify({'error': str(e)}), 500






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


@app.route('/favicon.ico')
def favicon():
    app.logger.debug('Favicon loaded successfully')  # Add this debug message
    return url_for('static', filename='favicon.ico')
    
@app.route('/karte')
def karte():
    # Additional logic can be added here if needed
    return render_template('karte.html')


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
                # flash('Your password has been reset successfully.', 'success')
                return redirect(url_for('login'))
            # else:
                # flash('Invalid phone number.', 'danger')
        # else:
            # flash('Invalid OTP. Please try again.', 'danger')
    return render_template('reset_password.html')
    
@app.route('/beitraege')
def beitraege():
    return render_template('beitraege.html')
    
@app.route('/submit_project', methods=['GET', 'POST'])
@login_required
def submit_project():
    if request.method == 'POST':
        # Debugging: Print form data
        logging.debug("Form data received: %s", request.form)
        logging.debug("Files received: %s", request.files)

        # Extract form data
        name = request.form.get('name')  # Instead of 'title'
        category = request.form.get('category')
        descriptionwhy = request.form.get('descriptionwhy')
        public_benefit = request.form.get('public_benefit')
        image = request.files.get('image_file')  # Ensure this matches the 'name' attribute in your HTML form
        geoloc = request.form.get('geoloc')  # Optional geolocation data

        # Debugging: Print extracted data
        logging.debug("Project name: %s, Category: %s, Description: %s", name, category, descriptionwhy)

        if image:
            image_filename = secure_filename(image.filename)
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
            image.save(image_path)

            # Debugging: Confirm image saving
            logging.debug("Image saved to: %s", image_path)

            current_time = datetime.now(pytz.utc) + timedelta(hours=1)  # Adjusting time to your timezone

            new_project = Project(
                name=name,
                category=category,
                descriptionwhy=descriptionwhy,
                public_benefit=public_benefit,
                image_file=image_filename,
                geoloc=geoloc,
                author=current_user.id,
                date=current_time  # Corrected field for the timestamp
            )

            # Debugging: Print new project details
            logging.debug("New project details: %s", new_project.to_dict())

            db.session.add(new_project)
            db.session.commit()

            # Debugging: Confirm database commit
            logging.debug("New project added to database with ID: %s", new_project.id)

            return redirect(url_for('index'))
        else:
            return redirect(url_for('submit_project'))

    # Display the form for GET request
    return render_template('beitraege.html')





@app.route('/list')
@app.route('/list/pages/<int:page>')
def list_view(page=1):
    per_page = 9  # Number of projects per page

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
   # Paginate the query using keyword arguments
    paginated_projects = query.paginate(page=page, per_page=per_page, error_out=False)

    # Debugging: print current page and number of pages
    logging.debug(f"Current Page: {paginated_projects.page}")
    logging.debug(f"Total Pages: {paginated_projects.pages}")

    return render_template('list.html', projects=paginated_projects.items, pagination=paginated_projects)
    
def get_project_by_id(project_id):
    return Project.query.get_or_404(project_id)

@app.route('/project_details/<int:project_id>', methods=['GET', 'POST'])
def project_details(project_id):
    try:
        project = get_project_by_id(project_id)
        comments = Comment.query.filter_by(project_id=project_id).all()

        # Handle comment submission
        if request.method == 'POST' and current_user.is_authenticated:
            comment_text = request.form.get('comment')
            new_comment = Comment(text=comment_text, user_id=current_user.id, project_id=project_id)
            db.session.add(new_comment)
            db.session.commit()
            logging.debug("New comment added: %s", comment_text)
            return redirect(url_for('project_details', project_id=project_id))

        # Fetch votes for the project
        votes = Vote.query.filter_by(project_id=project_id).all()
        upvote_count = sum(vote.upvote for vote in votes)
        downvote_count = sum(vote.downvote for vote in votes)
        total_votes = upvote_count + downvote_count

        upvote_percentage = (upvote_count / total_votes * 100) if total_votes > 0 else 0
        downvote_percentage = (downvote_count / total_votes * 100) if total_votes > 0 else 0

        # Fetch the author of the project
        project_author = User.query.get(project.author)
        author_name = f"{project_author.name} {project_author.surname}" if project_author else "Unknown"

        # Fetch the authors of the comments
        comments_with_authors = []
        for comment in comments:
            author = User.query.get(comment.user_id)
            comments_with_authors.append({
                "text": comment.text,
                "timestamp": comment.timestamp,
                "author_name": f"{author.name} {author.surname}" if author else "Unknown"
            })

        logging.debug("Displaying project details for project ID: %s", project_id)
        return render_template('project_details.html', project=project, upvote_percentage=upvote_percentage, 
                               downvote_percentage=downvote_percentage, upvote_count=upvote_count, downvote_count=downvote_count, 
                               author_name=author_name, comments=comments_with_authors)
    except Exception as e:
        logging.error("Error in project_details route: %s", str(e))
        return str(e)  # or redirect to a generic error page


    
@app.route('/downvote/<int:project_id>', methods=['POST'])
@login_required
def downvote(project_id):
    project = Project.query.get_or_404(project_id)
    existing_downvote = Downvote.query.filter_by(user_id=current_user.id, project_id=project.id).first()

    if existing_downvote:
        # flash('You have already downvoted this project.', 'info')
        return redirect(url_for('list_view'))

    downvote = Downvote(user_id=current_user.id, project_id=project.id, ip_address=request.remote_addr)
    db.session.add(downvote)
    db.session.commit()
    # flash('Your downvote has been recorded!', 'success')
    return redirect(url_for('list_view'))


@app.route('/vote/<int:project_id>/<string:vote_type>', methods=['POST'])
@login_required
def vote(project_id, vote_type):
    project = Project.query.get_or_404(project_id)
    
    # Check for existing votes by the user for this project
    existing_vote = Vote.query.filter_by(user_id=current_user.id, project_id=project.id).first()

    if existing_vote:
        db.session.delete(existing_vote)

    new_vote = Vote(user_id=current_user.id, project_id=project.id)
    if vote_type == 'upvote':
        new_vote.upvote = True
        new_vote.downvote = False
        app.logger.debug(f"Upvote received for project {project_id} by user {current_user.id}")
    elif vote_type == 'downvote':
        new_vote.downvote = True
        new_vote.upvote = False
        app.logger.debug(f"Downvote received for project {project_id} by user {current_user.id}")

    db.session.add(new_vote)
    db.session.commit()
    # flash('Your vote has been recorded!', 'success')
    return redirect(url_for('project_details', project_id=project_id))






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
    
    # flash('Your comment has been posted!', 'success')
    return redirect(url_for('list_view'))

@app.route('/opendata')
def opendata():
    # Additional logic can be added here if needed
    return render_template('opendata.html')

@app.route('/erfolge')
def erfolge():
    # Additional logic can be added here if needed
    return render_template('erfolge.html')

@app.route('/ueber')
def ueber():
    # Additional logic can be added here if needed
    return render_template('ueber.html')
    
@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    if request.method == 'POST':
        user_otp = request.form.get('otp')
        if 'user_data' in session and session['user_data']['otp'] == int(user_otp):
            user_data = session.pop('user_data')

            # Create new user instance without email
            new_user = User(
                phone_number=user_data['phone_number'],
                password_hash=generate_password_hash(user_data['password']),
                name=user_data['name'],
                surname=user_data['surname'],
                ip_address=user_data['ip_address']
            )
            db.session.add(new_user)
            db.session.commit()

            # Log in the user automatically
            login_user(new_user)

            logging.debug("New user registered: %s", new_user.phone_number)
            return jsonify({'success': True, 'message': 'Account successfully created'})
        else:
            logging.debug("OTP verification failed")
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

        # Adjusted to only check for phone number
        user = User.query.filter_by(phone_number=username_or_phone).first()

        if user and user.check_password(password):
            login_user(user)
            logging.debug("Login successful")
            # flash('Login successful!', 'success')
            return jsonify(success=True)
        else:
            logging.debug("Login failed")
            # flash('Login failed - invalid credentials.', 'danger')
            return jsonify(success=False)

    return render_template('login.html')



@app.route('/vote/<int:project_id>', methods=['GET', 'POST'])
@login_required
def single_vote(project_id):
    project = Project.query.get_or_404(project_id)
    if request.method == 'POST':
        vote = Vote(user_id=current_user.id, project_id=project.id, ip_address=request.remote_addr)
        db.session.add(vote)
        db.session.commit()
        # flash('Your vote has been recorded!', 'success')
        return redirect(url_for('index'))
    return render_template('vote.html', project=project)





if __name__ == "__main__":
    app.run(debug=True)
