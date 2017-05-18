#!dvp/bin/python
from __future__ import division
import csv, time, sys
from app import models, db
from math import sqrt, ceil
from random import randint
import distance
import multiprocessing as mp

data = models.Question.query.all()

def closest_centroid(C,e):
    dist = [distance.jaccard(data[c].tag.split(),e.tag.split()) for c in C]
    return [min(dist),dist.index(min(dist))]

def cluster(n):
    count = len(data)
    C = find_centroids(n)
    print('Found {0} centroids'.format(len(C)))
    sse = [0] * count
    counts = [0] * count
    for i,e in enumerate(data):
        if i in randgen.L:
            continue
        cc = closest_centroid(C,e)
        e.cluster = cc[1]
        sse[e.cluster] = cc[0]
        counts[e.cluster] += 1
    return [sse,counts]

def find_centroids(n):
    C = []
    PC = []
    m = 999999
    count = len(data)
    for i in range(0,100):
        C = randgen(n,count-1)
        sim = [[distance.jaccard(data[c1].tag.split(),data[c2].tag.split()) for c1 in C]
                for c2 in C]
        s = sum(sum(sim,[]))
        if m > s:
            m = s
            PC = C
    return PC

def randgen(n,m):
    l = []
    while len(l) < n:    
        r = randint(0,m-1)
        while (r in l) or (r in randgen.L):
            r = randint(0,m-1)
        l.append(r)
    return l
randgen.L = []

def main():
    for i,e in enumerate(data):
        if len(e.tag.split()) == 1:
            e.cluster = 86
            randgen.L.append(i)
        else:
            e.cluster = 0
    start = time.time()
    res = cluster(86)
    end = time.time()
    print('Clustering completed in {0} seconds'.format(end-start))
    start = time.time()
    db.session.commit()
    end = time.time()
    print('Committed in {0} seconds'.format(end-start))

if __name__=="__main__":
    main()
