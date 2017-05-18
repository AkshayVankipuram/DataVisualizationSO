#!dvp/bin/python
import csv, time
from glob import glob
import gensim
from app import models

def create_corpora():
    stoplist = []
    f = open('stopwords.txt')
    for row in f:
        stoplist.append(row.strip())
    f.close()
    
    q = models.Question.query.filter_by(cluster=4)
    tags = [e.tag.split() for e in q]
    all_tags = sum(tags,[])
    u_all_tags = list(set(all_tags))
    counts = [all_tags.count(t) for t in u_all_tags]
    count = q.count()
    add_tags = [t for i,t in enumerate(u_all_tags) if counts[i] >= 0.9 * count]
    stoplist.extend(add_tags)
    othertags = list(set(u_all_tags) - set(add_tags))

    start = time.time()
    documents = [e.text for e in q]
    dictionary = gensim.corpora.Dictionary(document.lower().split() for document in documents)
    stop_ids = [dictionary.token2id[stopword] for stopword in stoplist if stopword in dictionary.token2id]
    freq_ids = [tokenid for tokenid, docfreq in dictionary.dfs.iteritems() if docfreq <= 3]
    dictionary.filter_tokens(stop_ids + freq_ids)
    dictionary.compactify()
    end = time.time()
    print 'Word freq <= 3 removed in {0} sec'.format(end-start)
    
    start = time.time()
    dictionary.save('lda/lda_dict.dict')
    corpus = [dictionary.doc2bow(document.lower().split()) for document in documents]
    gensim.corpora.MmCorpus.serialize('lda/lda_corpus.mm', corpus)
    end = time.time()

    print 'Dictionary and Corpus created in {0} seconds'.format(end-start)

def create_model():
    start = time.time()
    id2word = gensim.corpora.Dictionary.load('lda/cluster4.dict')
    mm = gensim.corpora.MmCorpus('lda/cluster4.mm')
    lda = gensim.models.ldamodel.LdaModel(corpus=mm, id2word=id2word, num_topics=50, update_every=1, chunksize=10000 ,passes=1)
    lda.save('lda/cluster4.model')
    end = time.time()
    print 'Model created in {0} seconds'.format(end-start)

def main():
    #create_corpora()
    create_model()

if __name__ == "__main__":
    main()
