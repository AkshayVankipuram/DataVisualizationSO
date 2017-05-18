#!dvp/bin/python
from json import load 
import re, nltk, time
from nltk.stem.wordnet import WordNetLemmatizer
from nltk.corpus import wordnet, stopwords
import logging
logging.basicConfig(format='%(asctime)s : %(levelname)s : %(message)s', 
    level=logging.INFO)
#from gensim import corpora, models, similarities, matutils
import gensim
import numpy as np
import scipy.stats as stats
import matplotlib.pyplot as plt
from app import models

"""stops = []
f = open('stopwords.txt')
stops = [line.strip() for line in f]
f.close()

lmtzr = WordNetLemmatizer()
shortword = re.compile(r'\W*\b\w{1,2}\b')
 
tag_to_type = {'J': wordnet.ADJ, 'V': wordnet.VERB, 'R': wordnet.ADV}
def get_wordnet_pos(treebank_tag):
    return tag_to_type.get(treebank_tag[:1], wordnet.NOUN)

def clean(text):
    words = nltk.word_tokenize(shortword.sub('',text.lower()))
    filtered_words = [w for w in words if (not w in stops) and (w.isalnum())]
    tags = nltk.pos_tag(filtered_words)
    return ' '.join(
        lmtzr.lemmatize(word, get_wordnet_pos(tag[1]))
        for word, tag in zip(filtered_words, tags)
    )

 
for i in range(0,1):
    if i == 2:
        continue
    print('Begin cluster {0}'.format(i))
    start = time.time()
    q = models.Question.query.filter_by(cluster=i)
    documents = [clean(e.text) for e in q]
    dictionary = gensim.corpora.Dictionary(document.lower().split() for document in documents)
    once_ids = [tokenid for tokenid, docfreq in dictionary.dfs.iteritems() if docfreq == 1]
    dictionary.filter_tokens(once_ids)
    dictionary.compactify()
    dictionary.save('lda/cluster{0}.dict'.format(i))
    my_corpus = [dictionary.doc2bow(doc.lower().split()) for doc in documents] 
    gensim.corpora.MmCorpus.serialize('lda/cluster{0}.mm'.format(i), my_corpus)
    end = time.time()
    print('Cluster {0} completed in {1} seconds'.format(i,end-start))


def sym_kl(p,q):
    return np.sum([stats.entropy(p,q),stats.entropy(q,p)])

l = np.array([sum(cnt for _, cnt in doc) for doc in my_corpus])
def arun(corpus,dictionary,min_topics=15,max_topics=20,step=1):
    kl = []
    for i in range(min_topics,max_topics,step):
        lda = gensim.models.ldamodel.LdaModel(corpus=corpus,
            id2word=dictionary,num_topics=i)
        m1 = lda.expElogbeta
        U,cm1,V = np.linalg.svd(m1)
        #Document-topic matrix
        lda_topics = lda[my_corpus]
        m2 = gensim.matutils.corpus2dense(lda_topics, lda.num_topics).transpose()
        cm2 = l.dot(m2)
        cm2 = cm2 + 0.0001
        cm2norm = np.linalg.norm(l)
        cm2 = cm2/cm2norm
        kl.append(sym_kl(cm1,cm2))
    return kl
    
kl = arun(my_corpus,dictionary,max_topics=20)
 
# Plot kl divergence against number of topics
plt.plot(kl)
plt.ylabel('Symmetric KL Divergence')
plt.xlabel('Number of Topics')
plt.savefig('kldiv.png', bbox_inches='tight')
"""

my_corpus = gensim.corpora.MmCorpus('lda/cluster0.mm')
dictionary = gensim.corpora.Dictionary.load('lda/cluster0.dict')
lda = gensim.models.ldamodel.LdaModel(corpus=my_corpus,id2word=dictionary,num_topics=27,passes=10)
lda.save('lda/lda_0')

