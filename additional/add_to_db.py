#!dvp/bin/python
from app import models, db

def add(D):
    J = {}
    skipi = -1
    for i in range(0,len(D)):
        if i == skipi:
            continue
        if i < len(D) - 1:
            if D[i+1][0] == D[i][0]:
                if D[i][0] in J:
                    continue
                J[D[i][0]] = 1
                skipi = i+1
                qa = models.QandA(
                            title=D[i][0],
                            qcontent=D[i][1],
                            quser_id=D[i][2],
                            qvote=D[i][3],
                            qreputation=D[i][4],
                            acontent=D[i+1][1],
                            auser_id=D[i+1][2],
                            avote=D[i+1][3],
                            areputation=D[i+1][4],
                            tag=D[i][5],
                            cluster=D[i][6]
                        )
                db.session.add(qa)
    db.session.commit()


