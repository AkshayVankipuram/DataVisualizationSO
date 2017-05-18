from sqlalchemy import *
from migrate import *


from migrate.changeset import schema
pre_meta = MetaData()
post_meta = MetaData()
user = Table('user', pre_meta,
    Column('name', VARCHAR(length=64), primary_key=True, nullable=False),
    Column('counts', BLOB),
    Column('visited', BLOB),
    Column('topicWords', BLOB),
    Column('descriptions', BLOB),
    Column('topicHist', BLOB),
)

user = Table('user', post_meta,
    Column('name', String(length=64), primary_key=True, nullable=False),
    Column('counts', PickleType),
    Column('visited', PickleType),
    Column('topicWords', PickleType),
    Column('topicObj', PickleType),
    Column('descriptions', PickleType),
)


def upgrade(migrate_engine):
    # Upgrade operations go here. Don't create your own engine; bind
    # migrate_engine to your metadata
    pre_meta.bind = migrate_engine
    post_meta.bind = migrate_engine
    pre_meta.tables['user'].columns['topicHist'].drop()
    post_meta.tables['user'].columns['topicObj'].create()


def downgrade(migrate_engine):
    # Operations to reverse the above upgrade go here.
    pre_meta.bind = migrate_engine
    post_meta.bind = migrate_engine
    pre_meta.tables['user'].columns['topicHist'].create()
    post_meta.tables['user'].columns['topicObj'].drop()
