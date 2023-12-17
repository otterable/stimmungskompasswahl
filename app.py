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
            return redirect(url_for('profil'))
    except Exception as e:
        logging.error("Error in downloading images: %s", e)
        # flash('Error in downloading images.', 'danger')
        return redirect(url_for('profil'))

@app.route('/')
def index():
    projects = Project.query.all()
    featured_projects = Project.query.filter_by(is_featured=True).all()

    # Calculate upvotes and downvotes for each project
    for project in projects + featured_projects:
        upvotes = Vote.query.filter_by(project_id=project.id, upvote=True).count()
        downvotes = Vote.query.filter_by(project_id=project.id, downvote=True).count()

        project.upvotes = upvotes
        project.downvotes = downvotes
        project.upvote_percentage = (upvotes / (upvotes + downvotes) * 100) if (upvotes + downvotes) > 0 else 0
        project.downvote_percentage = (downvotes / (upvotes + downvotes) * 100) if (upvotes + downvotes) > 0 else 0

    project_count = len(projects)
    return render_template('index.html', projects=projects, project_count=project_count, featured_projects=featured_projects)



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
    users = User.query.all()

    if request.method == 'POST':
        project_id = request.form.get('project_id')

        if 'mark_important' in request.form:
            project = Project.query.get(project_id)
            if project:
                project.is_important = True
                db.session.commit()
                flash('Project marked as important', 'success')
            else:
                flash('Project not found for marking as important', 'error')

        elif 'unmark_important' in request.form:
            project = Project.query.get(project_id)
            if project:
                project.is_important = False
                db.session.commit()
                flash('Project unmarked as important', 'success')
            else:
                flash('Project not found for unmarking as important', 'error')

        elif 'mark_featured' in request.form:
            project = Project.query.get(project_id)
            if project:
                project.is_featured = True
                db.session.commit()
                flash('Project marked as featured', 'success')
            else:
                flash('Project not found for marking as featured', 'error')

        elif 'unmark_featured' in request.form:
            project = Project.query.get(project_id)
            if project:
                project.is_featured = False
                db.session.commit()
                flash('Project unmarked as featured', 'success')
            else:
                flash('Project not found for unmarking as featured', 'error')

        elif 'delete_project' in request.form:
            project = Project.query.get(project_id)
            if project:
                db.session.delete(project)
                db.session.commit()
                flash(f'Project {project_id} successfully deleted.', 'success')
            else:
                flash(f'Project {project_id} not found for deletion.', 'error')

        return redirect(url_for('admintools'))

    sort = request.args.get('sort', 'score_desc')
    search_query = request.args.get('search', '')
    query = Project.query

    if search_query:
        query = query.filter(Project.name.contains(search_query))

    projects = query.all()
    for project in projects:
        user = User.query.get(project.author)
        project.author_name = f"{user.name} {user.surname}" if user else 'Unknown'
        project.comments_count = Comment.query.filter_by(project_id=project.id).count()
        project.upvotes = Vote.query.filter_by(project_id=project.id, upvote=True).count()
        project.downvotes = Vote.query.filter_by(project_id=project.id, downvote=True).count()
        project.score = project.upvotes - project.downvotes

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
        projects.sort(key=lambda x: x.name.lower())
    elif sort == 'alpha_desc':
        projects.sort(key=lambda x: x.name.lower(), reverse=True)
    else:
        projects.sort(key=lambda x: x.score, reverse=True)

    important_projects = [project for project in projects if project.is_important]
    featured_projects = [project for project in projects if project.is_featured]

    return render_template('admintools.html', projects=projects, sort=sort, search_query=search_query, users=users, important_projects=important_projects, featured_projects=featured_projects)

        
        
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

@app.route('/profil')
def profil():
    user_projects = None
    user_comments = None
    user_statistics = None

    if current_user.is_authenticated:
        user_projects = Project.query.filter_by(author=current_user.id).all()
        for project in user_projects:
            upvotes = Vote.query.filter_by(project_id=project.id, upvote=True).count()
            downvotes = Vote.query.filter_by(project_id=project.id, downvote=True).count()
            total_votes = upvotes + downvotes
            project.upvotes = upvotes
            project.downvotes = downvotes
            project.upvote_percentage = (upvotes / total_votes * 100) if total_votes > 0 else 0
            project.downvote_percentage = (downvotes / total_votes * 100) if total_votes > 0 else 0

        user_comments = db.session.query(Comment, Project.name).join(Project, Comment.project_id == Project.id).filter(Comment.user_id == current_user.id).all()

        # Calculate statistics
        num_projects = len(user_projects)
        num_comments = Comment.query.filter_by(user_id=current_user.id).count()

        # Find the most successful project
        most_successful_project = None
        max_upvotes = 0
        for project in user_projects:
            upvotes = Vote.query.filter_by(project_id=project.id, upvote=True).count()
            if upvotes > max_upvotes:
                max_upvotes = upvotes
                most_successful_project = project

        user_statistics = {
            'num_projects': num_projects,
            'num_comments': num_comments,
            'most_successful_project': most_successful_project
        }

    return render_template('profil.html', user_projects=user_projects, user_comments=user_comments, user_statistics=user_statistics, is_authenticated=current_user.is_authenticated)

@app.route('/erfolge')
def erfolge():
    # Additional logic can be added here if needed
    return render_template('erfolge.html')

@app.route('/ueber')
def ueber():
    # Additional logic can be added here if needed
    return render_template('ueber.html')

@app.route('/delete_project/<int:project_id>', methods=['POST'])
@login_required
def delete_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        app.logger.debug(f"User {current_user.id} attempting to delete project {project_id}, owned by user {project.author}")

        # Convert project.author to int for comparison
        project_author_id = int(project.author)
        app.logger.debug(f"Converted project.author to int: {project_author_id}")

        if project_author_id == current_user.id:
            db.session.delete(project)
            db.session.commit()
            app.logger.debug(f"Project {project_id} deleted successfully.")
            flash('Project successfully deleted.', 'success')
        else:
            flash('You do not have permission to delete this project.', 'danger')
            app.logger.debug(f"Permission denied to delete project {project_id}.")
    except Exception as e:
        flash(f'Error deleting project: {e}', 'danger')
        app.logger.error(f'Error deleting project: {e}')
    return redirect(url_for('profil'))


@app.route('/download_my_data')
@login_required
def download_my_data():
    user_id = current_user.id

    # Fetch user data
    user_data = User.query.filter_by(id=user_id).first()

    # Fetch user's projects
    projects = Project.query.filter_by(author=user_id).all()
    projects_data = [project.to_dict() for project in projects]

    # Fetch user's comments
    comments = Comment.query.filter_by(user_id=user_id).all()
    comments_data = [comment.to_dict() for comment in comments]

    # Fetch user's votes
    votes = Vote.query.filter_by(user_id=user_id).all()
    votes_data = [vote.to_dict() for vote in votes]

    # Aggregate data
    data = {
        'user_info': {
            'name': user_data.name,
            'surname': user_data.surname,
            'phone_number': user_data.phone_number,
            'account_creation': user_data.account_creation.strftime("%Y-%m-%d %H:%M:%S"),
            'ip_address': user_data.ip_address
        },
        'projects': projects_data,
        'comments': comments_data,
        'votes': votes_data
    }

    # Convert data to JSON format
    response = jsonify(data)
    response.headers['Content-Disposition'] = f'attachment; filename=user_{user_id}_data.json'
    return response




@app.route('/delete_comment/<int:comment_id>', methods=['POST'])
@login_required
def delete_comment(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    if comment.user_id == current_user.id:
        db.session.delete(comment)
        db.session.commit()
        # Add a flash message or redirect as needed
    return redirect(url_for('profil'))

    
@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    if request.method == 'POST':
        user_otp = request.form.get('otp')
        if 'user_data' in session and session['user_data']['otp'] == int(user_otp):
            # Handle New User Registration
            user_data = session.pop('user_data')

            new_user = User(
                phone_number=user_data['phone_number'],
                password_hash=generate_password_hash(user_data['password']),
                name=user_data['name'],
                surname=user_data['surname'],
                ip_address=user_data['ip_address']
            )
            db.session.add(new_user)
            db.session.commit()

            login_user(new_user)
            logging.debug("New user registered: %s", new_user.phone_number)
            return jsonify({'success': True, 'message': 'Account successfully created'})

        elif 'reset_otp' in session and session['reset_otp'] == int(user_otp):
            # Handle Password Reset
            phone_number = session.pop('phone_number')
            user = User.query.filter_by(phone_number=phone_number).first()
            if user:
                new_password = request.form.get('new_password')
                user.set_password(new_password)
                db.session.commit()
                logging.debug(f"Password reset for user with phone number {phone_number}")
                flash('Your password has been reset successfully.', 'success')
                return redirect(url_for('login'))
            else:
                flash('User not found.', 'error')

        else:
            logging.debug("OTP verification failed")
            flash('Invalid OTP', 'error')

    return render_template('verify_otp.html')



@app.route('/password_recovery', methods=['GET', 'POST'])
def password_recovery():
    if request.method == 'POST':
        phone_number = request.form['phone_number']
        user = User.query.filter_by(phone_number=phone_number).first()
        if user:
            otp = randint(100000, 999999)
            client = Client(account_sid, auth_token)
            client.messages.create(
                body=f"Your OTP is: {otp}",
                from_=twilio_number,
                to=phone_number
            )
            session['phone_number'] = phone_number
            session['otp'] = otp
            return redirect(url_for('verify_otp'))
        else:
            flash('Phone number not found', 'error')
    return render_template('password_recovery.html')


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



@app.route('/categories')
def categories():
    return render_template('categories.html')
    

@app.route('/favicon.ico')
def favicon():
    app.logger.debug('Favicon loaded successfully')  # Add this debug message
    return url_for('static', filename='favicon.ico')



@app.route('/api/shapes', methods=['POST'])
def add_shape2():
    try:
        print("Request method:", request.method)
        print("Is JSON:", request.is_json)

        # Check if the request is JSON
        if request.is_json:
            data = request.json
            shape_data_json = json.dumps(data.get('shape_data', {}))
            shape_note = data.get('shape_note', '')  # For JSON requests
        else:
            # Handling Form data
            data = request.form
            shape_data_json = data.get('shape_data', '{}')
            shape_note = data.get('note', '')  # For form data, the key is 'note'

        print("Shape Note:", shape_note)
        print("Form Data:", data)

        new_shape = Shape(
            shape_data=shape_data_json,
            shape_note=shape_note,
            shape_type=data.get('shape_type', ''),
            shape_color=data.get('shape_color', '#212120'),
            molen_id=data.get('molen_id', 'null'),
            score=data.get('score', 'null'),
            highlight_id=data.get('highlight_id', 'null')
        )

        radius = data.get('radius')
        if new_shape.shape_type == 'circle' and radius and radius != 'null':
            new_shape.radius = float(radius)
        else:
            new_shape.radius = None

        if 'shape_image' in request.files:
            image = request.files['shape_image']
            if image and image.filename != '':
                filename = secure_filename(image.filename)
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                if not os.path.exists(app.config['UPLOAD_FOLDER']):
                    os.makedirs(app.config['UPLOAD_FOLDER'])
                image.save(image_path)
                new_shape.shape_imagelink = image_path
                print(f"Image saved at {image_path}")
            else:
                print("No image uploaded")

        if hasattr(new_shape, 'shape_imagelink'):
            print("Image Link:", new_shape.shape_imagelink)

        db.session.add(new_shape)
        db.session.commit()
        print(f"New shape added with ID: {new_shape.id}")

        return jsonify(success=True, id=new_shape.id, image_link=getattr(new_shape, 'shape_imagelink', None))

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify(success=False, error=str(e)), 500
    
@app.route('/api/colorOrder')
def color_order():
    try:
        with open('templates/categories.html', 'r') as file:
            content = file.read()
            soup = BeautifulSoup(content, 'html.parser')
            colors = [button['style'].split(': ')[1] for button in soup.find_all('button', {'class': 'categorybutton'})]
            return jsonify({'colorOrder': colors})
    except Exception as e:
        print(f"Error retrieving color order: {e}")
        return jsonify({'error': 'Could not retrieve color order'}), 500

@app.route('/api/shapes', methods=['GET'])
def get_shapes():
    shapes = Shape.query.all()
    shapes_data = []

    for shape in shapes:
        # Construct the shape data
        shape_info = {
            'id': shape.id,
            'shape_data': json.loads(shape.shape_data),
            'shape_type': shape.shape_type,
            'shape_color': shape.shape_color,
            'radius': shape.radius,
            'shape_note': shape.shape_note,
            'shape_imagelink': shape.shape_imagelink
        }
        shapes_data.append(shape_info)

        # Print the name of the image file if it exists
        if shape.shape_imagelink:
            image_name = os.path.basename(shape.shape_imagelink)
            print(f"Image file fetched: {image_name}")

    print('Shapes fetched:', len(shapes_data))
    return jsonify(shapes=shapes_data)




@app.route('/api/add-shape', methods=['POST'])
def add_shape():
    shape_data = request.json.get('shape_data')
    shape_note = request.json.get('shape_note', '')
    shape_type = request.json.get('shape_type')
    shape_color = request.json.get('shape_color', '#FFFFFF')

    new_shape = Shape(shape_data=shape_data, shape_note=shape_note, shape_type=shape_type, shape_color=shape_color)
    db.session.add(new_shape)
    db.session.commit()

    return jsonify({'success': True, 'id': new_shape.id})
    
@app.route('/api/shapes/<int:shape_id>', methods=['DELETE'])
def delete_shape(shape_id):
    shape = Shape.query.get(shape_id)
    if shape:
        db.session.delete(shape)
        db.session.commit()
        print('Shape deleted with ID:', shape_id)

        # Call the get_shapes route to fetch the updated list of shapes
        updated_shapes_data = get_shapes().get_json()
        return jsonify(success=True, shapes=updated_shapes_data['shapes']), 200
    else:
        print('Shape not found with ID:', shape_id)
        return jsonify(success=False), 404
        
@app.route('/export-geojson', methods=['GET'])
def export_geojson():
    # Query all shapes from the database
    shapes = Shape.query.all()
    
    # Construct GeoJSON features list
    features = []
    for shape in shapes:
        # Parse shape data and create GeoJSON feature
        feature = {
            "type": "Feature",
            "geometry": json.loads(shape.shape_data),
            "properties": {
                "id": shape.id,
                "note": shape.shape_note,
                "type": shape.shape_type,
                "color": shape.shape_color,
                "molen_id": shape.molen_id,
                "score": shape.score,
                "highlight_id": shape.highlight_id,
                "radius": shape.radius,
                "imagelink": shape.shape_imagelink
            }
        }
        features.append(feature)
    
    # Construct the full GeoJSON structure
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    # Convert the GeoJSON to a string and then to a BytesIO object for file download
    geojson_str = json.dumps(geojson, indent=2)
    geojson_bytes = io.BytesIO(geojson_str.encode('utf-8'))
    
    # Send the GeoJSON file to the client
    return send_file(geojson_bytes, mimetype='application/json',
    as_attachment=True, download_name='shapes_export.geojson')

@app.route('/import-geojson', methods=['POST'])
def import_geojson():
    try:
        uploaded_file = request.files['file']
        if uploaded_file:
            geojson_data = json.load(uploaded_file)
            for feature in geojson_data['features']:
                shape_data = json.dumps(feature['geometry'])
                shape_note = feature['properties']['note']
                shape_type = feature['properties']['type']
                shape_color = feature['properties']['color']
                molen_id = feature['properties']['molen_id']
                score = feature['properties']['score']
                highlight_id = feature['properties']['highlight_id']
                radius = feature['properties']['radius']
                shape = Shape(
                    shape_data=shape_data,
                    shape_note=shape_note,
                    shape_type=shape_type,
                    shape_color=shape_color,
                    molen_id=molen_id,
                    score=score,
                    highlight_id=highlight_id,
                    radius=radius
                )
                db.session.add(shape)
            db.session.commit()
            return '''
                <script>
                    alert('GeoJSON data imported successfully');
                    window.location.href = '/';
                </script>
            '''
        else:
            return '''
                <script>
                    alert('No file uploaded');
                    window.location.href = '/';
                </script>
            '''
    except Exception as e:
        return '''
            <script>
                alert('Error: {}');
                window.location.href = '/';
            </script>
        '''.format(str(e))

# Function to count all objects, category objects, and colors
def count_objects():
    total_objects = Shape.query.count()
    categories = Shape.query.with_entities(Shape.shape_type).distinct()
    category_counts = {}
    color_counts = {}

    for category in categories:
        category_counts[category[0]] = Shape.query.filter_by(shape_type=category[0]).count()

    # Count objects by color
    colors = Shape.query.with_entities(Shape.shape_color).distinct()
    for color in colors:
        color_counts[color[0]] = Shape.query.filter_by(shape_color=color[0]).count()

    return total_objects, category_counts, color_counts


@app.route('/stimmungskarte')
def index():
    total_objects, category_counts, color_counts = count_objects()  # Assuming count_objects is already defined as per your previous messages.
    return render_template('stimmungskarte.html', category_counts=category_counts, color_counts=color_counts, favicon=favicon)


if __name__ == "__main__":
    app.run(debug=True)
