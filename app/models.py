from app import db

class User(db.Model):
    __tablename__ = 'user'
    name = db.Column(db.String(64), unique=True, primary_key=True)
    counts = db.Column(db.PickleType)
    visited = db.Column(db.PickleType)
    topicWords = db.Column(db.PickleType)
    descriptions = db.Column(db.PickleType)

    def __repr__(self):
        return self.name

class Question(db.Model):
    __tablename__ = 'question'
    title = db.Column(db.String(256), unique=True, primary_key=True)
    content = db.Column(db.Text)
    text = db.Column(db.Text)
    user_id = db.Column(db.String(128))
    vote = db.Column(db.Integer)
    reputation = db.Column(db.Integer)
    tag = db.Column(db.Text)
    cluster = db.Column(db.Integer)
    subcluster = db.Column(db.Integer)
    rating = db.Column(db.Integer)

    def __repr__(self):
        return self.title

class Answer(db.Model):
    __tablename__ = 'answer'
    id = db.Column(db.Integer,primary_key=True)
    title = db.Column(db.String(256))
    content = db.Column(db.Text)
    user_id = db.Column(db.String(128))
    vote = db.Column(db.Integer)
    reputation = db.Column(db.Integer)
    accepted = db.Column(db.Boolean) 
    
    def __repr__(self):
        return self.title


