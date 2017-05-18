from __future__ import division
from flask import request, render_template, redirect, url_for, jsonify, Markup, session
from app import app, models, db
import os, glob, json
import distance
from time import time
from random import randint

APP_STATIC = os.path.join(os.path.dirname(os.path.abspath(__file__)),'static')
USER_PATH = os.path.join(APP_STATIC,'resources/users')

@app.route('/')
def init():
    return redirect(url_for('login'))

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/overview')
def overview():
    u = request.args.get('user')
    counts = read_cluster_counts()
    if not db.session.query(db.exists().where(models.User.name==u)).scalar():
        user = models.User(name=u,counts=([0.0]*87),visited=[],topicWords=[],descriptions=[])
        db.session.add(user)
        db.session.commit()
        write_user_file(u,{})
    user = models.User.query.get(u)
    session['user'] = u
    return render_template('overview.html',user=u,progress=create_cluster_obj(user.counts),description=user.descriptions)

def read_user_file(u):
    if not os.path.isfile(USER_PATH+'/{0}.json'.format(u)):
        write_user_file(u,{})
    f = open(USER_PATH+'/{0}.json'.format(u),'r')
    j = json.load(f)
    f.close()
    return j

def write_user_file(u,j):
    f = open(USER_PATH+'/{0}.json'.format(u),'w')
    json.dump(j,f)
    f.close()
    return 0

def rand_progress(obj):
    obj.sort(key=lambda x: int(x['name'].split('Cluster')[1]))
    c = [randint(0,cluster['size']) for cluster in obj]
    return c

def create_cluster_obj(counts):
    c = {}
    for i in range(0,87):
        if i in counts:
            c['Cluster{0}'.format(i)] = counts[i]
        else:
            c['Cluster{0}'.format(i)] = 0
    return c

@app.route('/home/cluster<int:c>')
def home(c=0):
    if 'user' not in session:
        session['user'] = 'avankipu'
    return render_template('home.html',cluster=c,user=session['user'])

@app.route('/logout')
def logout():
    return redirect('/login')

@app.route('/cluster_counts')
def cluster_counts():
    return jsonify(results=read_cluster_counts())

def read_cluster_counts():
    files = glob.glob(os.path.join(APP_STATIC,'resources/clusters/*.json'))
    J = {'name' : 'java', 'children': [] }
    for file in files:
        f = open(file)
        j = json.load(f)
        J['children'].append({'name': j['name'], 'size': j['size']})
        f.close()
    return J

@app.route('/get_topics')
def get_topics():
    cluster = request.args.get('cluster',0,type=int)
    J = read_topics(cluster)
    return jsonify(results={'topics': J['topicword'], 'words': J['wordtopic'], 'desc': J['desc']})

def read_topics(cluster):
    J = {}
    p = os.path.join(APP_STATIC,'resources/topic_clusters/topic_cluster{0}.json'.format(cluster))
    if os.path.isfile(p):
        with open(p) as f:
            J = json.load(f)
    return J

@app.route('/get_questions_by_topic')
def get_questions_by_topic():
    topics = json.loads(request.args.get('topic'))
    cluster = request.args.get('cluster',0,type=int)
    order = request.args.get('order')
    expr = db.or_(*[models.Question.subcluster==t for t in topics])
    results = {}
    start = time()
    q = models.Question.query.filter_by(cluster=cluster).filter(expr)
    if 'user' in session:
        user = models.User.query.get(session['user'])
    else:
        user = models.User.query.get('avankipu')
    if len(user.visited) > 0:
        vis_expr = db.and_(*[db.not_(models.Question.title.contains(v)) for v in user.visited])
        q = q.filter(vis_expr)
    for e in q.limit(25): 
        results[e.title] = { 
                'q' : {
                    'content' : e.content,
                    'votes' : e.vote,
                    'reputation' : e.reputation,
                    'user_id' : e.user_id
                } , 
                'a' : [], 
            }
        """a = models.Answer.query.filter(models.Answer.title.contains(e.title))
        for ae in a:
            results[e.title]['a'].append({
                'content' : ae.content,
                'votes' : ae.vote,
                'reputation' : ae.reputation,
                'user_id' : ae.user_id
            })"""
    return jsonify(results=results)

@app.route('/visited')
def visited():
    cluster = request.args.get('cluster',0,type=int)
    vis = request.args.get('visited')
    if 'user' not in session:
        session['user'] = 'avankipu'
    user = models.User.query.get(session['user'])
    if vis not in user.visited:
        user.counts[cluster] += 1
    user.visited.append(vis)
    user.visited = list(set(user.visited))
    db.session.commit()
    return jsonify(results={'progress': user.counts[cluster]})

@app.route('/visited_topics')
def visited_topics():
    topics = json.loads(request.args.get('topic'))
    topicWords = json.loads(request.args.get('topicWords'))
    action = request.args.get('action',0,type=int)
    if 'user' not in session:
        session['user'] = 'avankipu'
    user = models.User.query.get(session['user'])
    J = read_user_file(session['user'])
    if action == 1:
        for word in topicWords:
            if word in J:
                J[word] -= 1
            user.topicWords.remove(word)
    else:
        for word in topicWords:
            if word in J:
                J[word] += 1
            else:
                J[word] = 1
        user.topicWords.extend(topicWords)
    write_user_file(session['user'],J)
    user.topicWords = list(set(user.topicWords))
    db.session.commit()
    return jsonify(results={})

def construct_raw_query(cluster,topics,order):
    sql = 'select * from question where question.cluster={0} and ('.format(cluster)
    o = ''
    for t in topics:
        sql += '{0}question.subcluster={1}'.format(o,t)
        o = ' or '
    sql += ') order by question.{0} desc limit 15'.format(order)
    return db.text(sql)

@app.route('/get_questions')
def get_questions():
    topics = json.loads(request.args.get('topics'))
    word = request.args.get('word')
    action = request.args.get('action',0,type=int)
    results = {}
    if len(topics) == 0:
        return jsonify(results=results)
    expr = db.and_(*[models.Question.subcluster==topic for topic in topics])
    cluster = request.args.get('cluster',0,type=int)
    q = models.Question.query.filter_by(cluster=cluster).filter(expr)
    if 'user' in session:
        user = models.User.query.get(session['user'])
    else:
        user = models.User.query.get('avankipu')
    if len(user.visited) > 0:
        vis_expr = db.and_(*[db.not_(models.Question.title.contains(v)) for v in user.visited])
        q = q.filter(vis_expr)
    
    if action == 1:
        q = q.filter(db.not_(models.Question.text.contains(word)))
    else:
        q = q.filter(models.Question.text.contains(word))

    for e in q.limit(25):
        results[e.title] = { 
                'q' : {
                    'content' : e.content,
                    'votes' : e.vote,
                    'reputation' : e.reputation,
                    'user_id' : e.user_id
                } , 
                'a' : [], 
            }
    return jsonify(results=results)

@app.route('/all_clusters_user_sim')
def all_clusters_user_similarity():
    if 'user' not in session:
        session['user'] = 'avankipu'
    user = models.User.query.get(session['user'])
    cc = read_cluster_counts()['children']
    cc.sort(key=lambda x: int(x['name'].split('Cluster')[1]))
    counts = []
    desc = {}
    for i in range(0,87):
        t = read_topics(i)
        if t:
            desc['Cluster{0}'.format(i)]= t['desc']
            if cc[i]['size'] > 0:
                prog = user.counts[i]/cc[i]['size']
            else:
                prog = 0.0
            sim = average_sim(user.topicWords,t['wordtopic'].keys())
            fsim = (0.9 * sim) - (prog * 0.1)
            counts.append({
                'c' : i, 
                's' :  fsim
            })
        else:
            counts.append({'c' : i, 's' : 0})
    counts.sort(key=lambda x: x['s'],reverse=True)
    _min = min(counts,key=lambda x: x['s'])
    _max = max(counts,key=lambda x: x['s'])
    clusters = {}
    for c in counts:
        clusters['Cluster{0}'.format(c['c'])] = c['s']
    return jsonify(results={'clusters' : clusters, 'min' : _min['s'], 'max' : _max['s'], 'desc': desc})

@app.route('/cluster_user_sim')
def cluster_user_sim():
    cluster = request.args.get('cluster',0,type=int)
    if 'user' not in session:
        session['user'] = 'avankipu'
    user = models.User.query.get(session['user'])
    t = read_topics(cluster)
    topics = t['topicword']
    utopics = user.topicWords
    with open(os.path.join(APP_STATIC,'resources/clusters/cluster{0}.json'.format(cluster))) as f:
        cc = json.load(f)
        count = cc['size']
    results = {}
    l = []
    for topic in topics:
        words = list(topics[topic].keys())
        if len(utopics) > 0:
            l.append(distance.jaccard(utopics,words))
            results[topic] = distance.jaccard(utopics,words)
        else:
            l.append(0.0)
            results[topic] = 0.0
    return jsonify(results={'topics' : results, 
        'max': max(l), 'min': min(l), 
        'progress': user.counts[cluster],
        'count': count})

@app.route('/prefs')
def preference():
    if 'user' not in session:
        session['user'] = 'avankipu'
    j = read_user_file(session['user'])
    words = [{'name': w, 'count':int(j[w])} for w in j if w != 'java']
    words.sort(key=lambda x: x['count'],reverse=True)
    s = max([j[w] for w in j])
    return jsonify(results={'w':words[:10],'s':s})

@app.route('/update_prefs')
def update():  
    values = json.loads(request.args.get('vals'))
    if 'user' not in session:
        session['user'] = 'avankipu'
    j = read_user_file(session['user'])
    for v in values:
        j[v] = values[v]
    write_user_file(session['user'],j)
    return jsonify(results={})

def average_sim(utopics,ctopics):
    if len(utopics) == 0:
        return 0
    J = read_user_file(session['user'])
    s = sum([J[w] for w in J])
    c = []
    for word in utopics:
        c.append(ctopics.count(word) + (J[word]/s))
    #c = [ctopics.count(word) for word in utopics]
    return sum(c)/len(c)

def stdev(l):
    from math import pow, sqrt
    ml = sum(l)/len(l)
    sl = [pow(x-ml,2) for x in l]
    msl = sum(sl)/len(sl)
    return [sqrt(msl),ml]
