#!dvp/bin/python
import gensim
import csv, json, os
from app import models
from glob import glob

def main(model,cluster):
    print 'Running {0}'.format(cluster)
    
    lda = gensim.models.ldamodel.LdaModel.load(model)
    topics = lda.show_topics(lda.num_topics)

    ignore = []
    for topic in topics:
        l = topic.split('+')
        t = []
        for word in l:
            s = word.split('*')
            s = [w.strip() for w in s]
            ignore.append(s[1])
    
    ig = max([(word,ignore.count(word)) for word in set(ignore)],key=lambda x: x[1])
        
    T = {}
    W = {}
    for i,topic in enumerate(topics):
        T['Topic{0}'.format(i)] = {}
        l = topic.split('+')
        for word in l:
            s = word.split('*')
            s = [w.strip() for w in s]
            if s[1].isalnum() and s[1] != ig[0]:
                if s[1] not in W:
                    W[s[1]] = {}
                T['Topic{0}'.format(i)][s[1]] = float(s[0])
                W[s[1]]['Topic{0}'.format(i)] = float(s[0])

    with open('app/static/resources/topic_clusters/topic_cluster{0}.json'.format(cluster),'w') as f:
        json.dump({'topicword' : T, 'wordtopic' : W, 'desc' : ig[0]},f)

if __name__ == "__main__":
    models = glob('lda/lda_*')
    models = filter(lambda x: 'state' not in x, models)
    for model in models:
        c = model.split('_')[1]
        main(model,int(c))
