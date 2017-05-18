#!dvp/bin/python
from __future__ import division
from app import models,db
from math import ceil,sqrt

def stdev(l):
    ml = sum(l)/len(l)
    sl = [pow(x-ml,2) for x in l]
    msl = sum(sl)/len(sl)
    return sqrt(msl)

def split(l):
    m = sum(l)/len(l)
    sd = stdev(l) 
    sl = [[],[],[],[],[]]
    for x in l:
        if x-m > 2*sd:
            sl[4].append(x)
        elif x-m > sd and x-m <= 2*sd:
            sl[3].append(x)
        elif x-m > -sd and x-m <= sd:
            sl[2].append(x)
        elif x-m > -2*sd  and x-m <= -sd:
            sl[1].append(x)
        elif x-m <= -2*sd:
            sl[0].append(x)
    return sl
 
if __name__=="__main__":

    s_arep = db.session.query(db.func.sum(models.Answer.reputation)).scalar()
    s_avote = db.session.query(db.func.sum(models.Answer.vote)).scalar()
    s_qvote = db.session.query(db.func.sum(models.Question.vote)).scalar()

    """for i in range(0,1):
        q = models.Question.query.filter_by(cluster=i)
         
        nl = []
        for qe in q:
            a = models.Answer.query.filter(models.Answer.title.contains(qe.title))
            s = [[],[]]
            for ae in a:
                s[0].append(ae.vote)
                s[1].append(ae.reputation)
            if len(s[0]) > 0 and len(s[1]) > 0:
                ava = sum(s[0])/len(s[0])
                avr = sum(s[1])/len(s[1])
                nl.append((qe.vote/s_qvote + ava/s_avote + avr/s_arep)/3.0)
                

        m = sum(nl)/len(nl)
        sd = stdev(nl)
        print(i,m,sd)
        for i,x in enumerate(nl):
            v = x-m
            if v > 2*sd:
                c[i].rating = 5
            elif v > sd and v <= 2*sd:
                c[i].rating = 4
            elif v > -sd and v <= sd:
                c[i].rating = 3
            elif v > -2*sd and v <= -sd:
                c[i].rating = 2
            elif v <= -2*sd:
                c[i].rating = 1
    db.session.commit()"""
