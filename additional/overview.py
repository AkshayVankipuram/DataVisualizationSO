#!dvp/bin/python
from app import models
import json
from glob import glob
import multiprocessing as mp

def worker(c):
    print 'Starting worker for Cluster {0}'.format(c)
    q = models.Question.query.filter_by(cluster=c)
    C = { 'name' : 'Cluster{0}'.format(c), 'children': [], 'size': q.count()}
    tags = [e.tag.split() for e in q]
    all_tags = sum(tags,[])
    u_all_tags = list(set(all_tags))
    for tag in u_all_tags:
        f = all_tags.count(tag)
        C['children'].append({ 'name' : tag, 'size': f})
    with open('app/static/resources/clusters/cluster{0}.json'.format(c),'w') as f:
        json.dump(C,f)
    return True

def combine():
    files = glob('app/static/resources/clusters/*.json')
    J = {'name' : 'java', 'children': [] }
    for file in files:
        f = open(file)
        j = json.load(f)
        J['children'].append({'name': j['name'], 'size': j['size']})
        f.close()
    f = open('app/static/resources/cluster_counts.json','w')
    json.dump(J,f)
    f.close()


def main():
    """data = { 'name' : 'java', 'children': [] }
    pool = mp.Pool(processes=mp.cpu_count()*3)
    jobs = [pool.apply_async(worker, args=(i,)) for i in range(0,87)]
    pool.close()
    pool.join()
    for job in jobs:
        job.get()"""
    combine()

if __name__=="__main__":
    main()
