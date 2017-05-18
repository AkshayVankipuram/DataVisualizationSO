#!dvp/bin/python
from app import models

c = models.Question.query.filter_by(cluster=0).count()

if c > 0:
    print("You're ready to go!")
