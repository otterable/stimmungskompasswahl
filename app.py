from flask import Flask, render_template, url_for, request, redirect, flash, session, jsonify, Response, json, send_file, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
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
    project_count = Project.query.count()  # Get the total count of projects
    for project in projects:
        project.image_file = quote(project.image_file)
    logging.debug("Projects: %s", projects)
    return render_template('index.html', projects=projects, project_count=project_count)


@app.route('/logout')
@login_required
def logout():
    logout_user()
    next_page = request.args.get('next')
    return redirect(next_page or url_for('index'))  # 'index' is the function name of your home route




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
            return jsonify({'success': False, 'message': 'Diese Telefonnummer ist bereits registriert.'}), 400

        # Generate OTP and handle verification
        otp = randint(100000, 999999)
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=f"Stimmungskompass: Ihr OTP ist: {otp}. Fügen Sie hinzu, um die Registrierung abzuschließen!",
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

            # Redirect to the project details page of the newly created project
            return redirect(url_for('project_details', project_id=new_project.id))
        else:
            return redirect(url_for('submit_project'))

    # Display the form for GET request
    return render_template('beitraege.html')




@app.route('/list')
@app.route('/list/pages/<int:page>')
def list_view(page=1):
    per_page = 9  # Number of projects per page
    query = Project.query
    category = request.args.get('category')
    sort = request.args.get('sort')
    search = request.args.get('search')

    # Apply category and search filters
    if category:
        query = query.filter(Project.category == category)
    if search:
        query = query.filter(Project.name.contains(search))

    # Apply combined sort filter
    if sort == 'oldest':
        query = query.order_by(Project.date.asc())
        logging.debug("Sorting by oldest posts")
    elif sort == 'lowest':
        query = query.outerjoin(Vote, Project.id == Vote.project_id) \
                    .group_by(Project.id) \
                    .order_by(func.sum(Vote.upvote - Vote.downvote))
        logging.debug("Sorting by lowest score")
    elif sort == 'newest':
        query = query.order_by(Project.date.desc())
        logging.debug("Sorting by newest posts")
    else:  # Default to highest score if no valid sort option is provided
        query = query.outerjoin(Vote, Project.id == Vote.project_id) \
                    .group_by(Project.id) \
                    .order_by(func.sum(Vote.upvote - Vote.downvote).desc())
        logging.debug("Sorting by highest score")

    # Execute the query and get the first three projects for debugging
    top_three_projects = query.limit(3).all()
    for project in top_three_projects:
        score = sum(vote.upvote - vote.downvote for vote in project.votes)
        logging.debug(f"Project: {project.name}, Date: {project.date}, Score: {score}")

    # Paginate the query
    paginated_projects = query.paginate(page=page, per_page=per_page, error_out=False)

    # Calculate upvote and downvote counts and percentages
    for project in paginated_projects.items:
        upvotes = sum(vote.upvote for vote in project.votes)
        downvotes = sum(vote.downvote for vote in project.votes)
        total_votes = upvotes + downvotes

        # Add upvote and downvote counts to each project
        project.upvotes = upvotes
        project.downvotes = downvotes

        # Calculate and add percentages
        if total_votes > 0:
            project.upvote_percentage = upvotes / total_votes * 100
            project.downvote_percentage = downvotes / total_votes * 100
        else:
            project.upvote_percentage = 0
            project.downvote_percentage = 0

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
        
        
@app.route('/admintools', methods=['GET', 'POST'])
@login_required
def admintools():
    # Retrieve users
    users = User.query.all()

    if request.method == 'POST':
        if 'mark_important' in request.form:
            project_id_to_mark_important = request.form.get('project_id')
            project_to_mark_important = Project.query.get(project_id_to_mark_important)
            if project_to_mark_important:
                project_to_mark_important.is_important = True
                db.session.commit()
                flash('Project marked as important', 'success')
            else:
                flash('Project not found for marking as important', 'error')
        else:
            project_id_to_delete = request.form.get('project_id')
            project_to_delete = Project.query.get(project_id_to_delete)
            if project_to_delete:
                # Delete the project
                db.session.delete(project_to_delete)
                db.session.commit()
                logging.debug(f"Project {project_id_to_delete} successfully deleted.")
            else:
                logging.debug(f"Project {project_id_to_delete} not found for deletion.")
        return redirect(url_for('admintools'))

    # GET request handling
    sort = request.args.get('sort', 'score_desc')
    search_query = request.args.get('search', '')
    search_user_query = request.args.get('searchUserByName', '')
    search_user_id_query = request.args.get('searchUserById', '')
    query = Project.query

    if search_query:
        query = query.filter(Project.name.contains(search_query))

    projects = query.all()
    for project in projects:
        user = User.query.get(project.author)
        if user:
            project.author_name = f"{user.name} {user.surname}"
        else:
            project.author_name = 'Unknown'
        project.comments_count = Comment.query.filter_by(project_id=project.id).count()
        upvotes = Vote.query.filter_by(project_id=project.id, upvote=True).count()
        downvotes = Vote.query.filter_by(project_id=project.id, downvote=True).count()
        project.upvotes = upvotes
        project.downvotes = downvotes
        project.score = upvotes - downvotes

    if sort == 'oldest':
        projects.sort(key=lambda x: x.date)
    elif sort == 'newest':
        projects.sort(key=lambda x: x.date, reverse=True)
    elif sort == 'category':
        projects.sort(key=lambda x: x.category)
    elif sort == 'user_id':
        projects.sort(key=lambda x: x.author)
    elif sort == 'upvotes':
        projects.sort(key=lambda x: x.upvotes, reverse=True)
    elif sort == 'downvotes':
        projects.sort(key=lambda x: x.downvotes, reverse=True)
    elif sort == 'comments':
        projects.sort(key=lambda x: x.comments_count, reverse=True)
    elif sort == 'alpha_asc':
        projects.sort(key=lambda x: x.name.lower())  # Sort alphabetically by project title
    elif sort == 'alpha_desc':
        projects.sort(key=lambda x: x.name.lower(), reverse=True)  # Sort alphabetically by project title (Z-A)
    else:
        projects.sort(key=lambda x: x.score, reverse=True)

    # Separate important projects
    important_projects = [project for project in projects if project.is_important]

    return render_template('admintools.html', projects=projects, sort=sort, search_query=search_query, users=users, search_user_query=search_user_query, search_user_id_query=search_user_id_query, important_projects=important_projects)

        
        
@app.route('/delete_my_data', methods=['POST'])
@login_required
def delete_my_data():
    try:
        user_id = current_user.id

        # Delete user's votes
        Vote.query.filter_by(user_id=user_id).delete()

        # Delete user's comments
        Comment.query.filter_by(user_id=user_id).delete()

        # Delete user's projects and associated files
        projects = Project.query.filter_by(author=user_id).all()
        for project in paginated_projects.items:
            total_votes = sum(vote.upvote + vote.downvote for vote in project.votes)
            project.upvotes = sum(vote.upvote for vote in project.votes)
            project.downvotes = sum(vote.downvote for vote in project.votes)
            if total_votes > 0:
                project.upvote_percentage = project.upvotes / total_votes * 100
                project.downvote_percentage = project.downvotes / total_votes * 100
            else:
                project.upvote_percentage = 0
                project.downvote_percentage = 0


        # Delete user account
        User.query.filter_by(id=user_id).delete()

        # Commit changes to the database
        db.session.commit()

        # Log out the user
        logout_user()

        # flash message or return JSON response
        return jsonify({'success': True, 'message': 'Your data has been deleted successfully.'})
    except Exception as e:
        logging.error(f"Error in delete_my_data: {e}")
        # flash message or return JSON response
        return jsonify({'success': False, 'message': 'An error occurred while deleting your data.'}), 500


@app.route('/delete_user', methods=['POST'])
@login_required
def delete_user():
    try:
        user_id_to_delete = request.form.get('user_id')
        user_to_delete = User.query.get(user_id_to_delete)
        if user_to_delete:
            # Delete user's votes
            Vote.query.filter_by(user_id=user_id_to_delete).delete()

            # Delete user's comments
            Comment.query.filter_by(user_id=user_id_to_delete).delete()

            # Delete user's projects and associated files
            projects_to_delete = Project.query.filter_by(author=user_id_to_delete).all()
            for project in projects_to_delete:
                # Delete associated votes and comments for each project
                Vote.query.filter_by(project_id=project.id).delete()
                Comment.query.filter_by(project_id=project.id).delete()

                # Delete project files (you may need to implement this logic)
                # For example, if you store project images in a folder, you can delete them here

                # Finally, delete the project itself
                db.session.delete(project)

            # Delete user account
            db.session.delete(user_to_delete)

            # Commit changes to the database
            db.session.commit()

            return jsonify({'success': True, 'message': 'User and their contributions have been deleted successfully.'})
        else:
            return jsonify({'success': False, 'message': 'User not found for deletion.'}), 404
    except Exception as e:
        logging.error(f"Error in delete_user: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while deleting the user and contributions.'}), 500


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

    # Re-fetch the project to get updated vote counts
    project = Project.query.get_or_404(project_id)
    upvote_count = sum(vote.upvote for vote in project.votes)
    downvote_count = sum(vote.downvote for vote in project.votes)
    total_votes = upvote_count + downvote_count
    upvote_percentage = (upvote_count / total_votes * 100) if total_votes > 0 else 0
    downvote_percentage = (downvote_count / total_votes * 100) if total_votes > 0 else 0

    # Return updated vote data
    return jsonify({
        'success': True,
        'message': 'Vote recorded',
        'upvote_count': upvote_count,
        'downvote_count': downvote_count,
        'upvote_percentage': upvote_percentage,
        'downvote_percentage': downvote_percentage
    })



@app.route('/comment/<int:project_id>', methods=['POST'])
@login_required
def comment(project_id):
    project = Project.query.get_or_404(project_id)
    comment_text = request.form.get('comment')

    # Add one hour to the current timestamp
    timestamp = datetime.now() + timedelta(hours=0)

    new_comment = Comment(text=comment_text, user_id=current_user.id, project_id=project_id, timestamp=timestamp)
    db.session.add(new_comment)
    db.session.commit()

    return jsonify({
        'text': new_comment.text,
        'author_name': f"{current_user.name} {current_user.surname}",
        'timestamp': new_comment.timestamp.strftime('%d.%m.%Y %H:%M')
    })

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

    # Convert data to JSON format
    data = {
        "projects": [project.to_dict() for project in projects],
        "votes": [vote.to_dict() for vote in votes],
        "comments": [comment.to_dict() for comment in comments]
    }

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
    # Capture 'next' parameter or set to index if not present
    next_page = request.args.get('next') or url_for('index')
    logging.debug(f"'next' parameter detected, user will be redirected to {next_page} after logging in.")

    if request.method == 'POST':
        username_or_phone = request.form.get('username_or_phone')
        password = request.form.get('password')
        user = User.query.filter_by(phone_number=username_or_phone).first()

        if user and user.check_password(password):
            login_user(user)
            logging.debug("Login successful")
            return jsonify(success=True, next=next_page)
        else:
            logging.debug("Login failed")
            return jsonify(success=False)

    return render_template('login.html', next=next_page)


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
