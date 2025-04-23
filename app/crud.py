

def create_object(db, model_class, obj_data: dict):
    obj = model_class(**obj_data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def get_object_by_id(db, model_class, obj_id: int):
    return db.query(model_class).filter(model_class.id == obj_id).first()

def update_object(db, obj, update_data: dict):
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj

def delete_object(db, obj):
    db.delete(obj)
    db.commit()
    return obj


def get_all_objects(db, model_class):
    return db.query(model_class).all()
