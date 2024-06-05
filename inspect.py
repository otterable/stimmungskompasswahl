import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash
from models import User  # Import the User model from your models.py

# Initialize the Flask application
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/project_voting.db'  # Adjust the path if necessary
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database
db = SQLAlchemy(app)

def inspect_and_fix_users():
    with app.app_context():
        users = User.query.all()
        for user in users:
            if not user.password_hash:
                print(f"User {user.id} has a None password_hash. Fixing it.")
                user.password_hash = generate_password_hash("default_password")  # Use a default password for fixing
                db.session.add(user)
        db.session.commit()
        print("Inspection and fixing completed.")

if __name__ == "__main__":
    inspect_and_fix_users()
