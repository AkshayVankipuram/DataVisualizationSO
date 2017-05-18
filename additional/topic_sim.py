#!dvp/bin/python
from __future__ import division
import json, math
import distance

def words(wlist):
    return [l['name'] for l in wlist]


def main():
    with open("app/static/resources/topics.json") as f:
        J = json.load(f)

    topics = J['children']

    MAT = []

    for i,topic1 in enumerate(topics):
        mat = []
        for j,topic2 in enumerate(topics):
            wl1 = words(topic1['children'])
            wl2 = words(topic2['children'])
            d = distance.jaccard(wl1,wl2)
            if d > 0.4:
                d = 1.0
            mat.append(1.0-d)
        MAT.append(mat)
    
    with open('app/static/resources/topic_sim.json','w') as f:
        json.dump(MAT,f)
    

if __name__ == "__main__":
    main()


