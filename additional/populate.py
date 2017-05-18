#!dvp/bin/python
import glob
import csv, os, io, time
import string
from app import models, db

stoplist = []

def remove_stopwords(text):
    text = filter(lambda x: x not in stoplist, text)
    return ' '.join(text).lower()

if __name__=="__main__":
    
    f = open('stopwords.txt')
    for word in f:
        stoplist.append(word.strip())
    f.close()

    files = glob.glob('dataset/*.csv')
    files.sort()

    J = {}
    for i,file in enumerate(files):
        frh = open(file)
        print('Reading: '+file)
        cr = csv.reader(frh)
        D = []
        start = time.time()
        for i,row in enumerate(cr):
            row = [r.decode(encoding="utf-8",errors="replace") for r in row]
            if row[0] == 'question':
                if row[1] in J:
                    continue
                J[row[1]] = 1
                q = models.Question(title=row[1],
                        content=row[2],
                        text=row[3],
                        user_id=row[4],
                        vote=row[5],
                        reputation=row[6],
                        tag=row[7],
                        cluster=0,
                        subcluster=0,
                        rating=3)
                db.session.add(q)
            elif row[0].find('answer') > -1:
                accepted = ('accepted-answer' in row[0])
                a = models.Answer(title=row[1],
                        content=row[2],
                        user_id=row[4],
                        vote=row[5],
                        reputation=row[6],
                        accepted=accepted)
                db.session.add(a)
        frh.close()
        if i % 10 == 0 and i > 0:
            db.session.commit()
        end = time.time()
        print('File read completed {0} seconds'.format(end-start))
    s = time.time()
    db.session.commit() 
    e = time.time()
    print('Committed in {0} seconds'.format(e-s))

