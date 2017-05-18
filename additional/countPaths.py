#!/usr/bin/python
import json

ST = {}
TT = {}

def count(tag,P):
    counter = 1
    for t in TT[tag]:
        if not t in P:
            P.add(t)
            counter += count(t,P)
        else:
            counter += 1
    return counter

def paths():
    J = {}
    for T in ST:
        J[T] = []
        for t in ST[T]:
            J[T].append(count(t,set()))
        J[T] = max(J[T])
    return J

if __name__=="__main__":
    f = open('app/static/tag_tree.json')
    TT = json.load(f)
    f.close()

    f = open('app/static/tags.json')
    ST = json.load(f)
    f.close()
   
    J = paths()
    f = open('paths.json','w')
    json.dump(J,f)
    f.close()
