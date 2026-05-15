using System.Collections.Generic;
using UnityEngine;

public class ObjectPool<T> where T : MonoBehaviour
{
    private Queue<T> _available = new Queue<T>();
    private HashSet<T> _inUse = new HashSet<T>();
    private T _prefab;
    private Transform _container;
    private int _defaultCapacity;

    public int AvailableCount => _available.Count;
    public int InUseCount => _inUse.Count;

    public ObjectPool(T prefab, int initialCapacity, Transform container = null)
    {
        _prefab = prefab;
        _defaultCapacity = initialCapacity;
        _container = container;

        for (int i = 0; i < initialCapacity; i++)
        {
            var obj = CreateNew();
            obj.gameObject.SetActive(false);
            _available.Enqueue(obj);
        }
    }

    private T CreateNew()
    {
        var obj = Object.Instantiate(_prefab, _container);
        obj.name = _prefab.name;
        return obj;
    }

    public T Get()
    {
        T obj;
        if (_available.Count > 0)
        {
            obj = _available.Dequeue();
        }
        else
        {
            obj = CreateNew();
        }

        obj.gameObject.SetActive(true);
        _inUse.Add(obj);
        return obj;
    }

    public void Return(T obj)
    {
        if (obj == null) return;

        obj.gameObject.SetActive(false);
        _inUse.Remove(obj);

        if (!_available.Contains(obj))
            _available.Enqueue(obj);
    }

    public void ReturnAll()
    {
        foreach (var obj in _inUse)
        {
            if (obj != null)
            {
                obj.gameObject.SetActive(false);
                _available.Enqueue(obj);
            }
        }
        _inUse.Clear();
    }

    public void Clear()
    {
        foreach (var obj in _available)
        {
            if (obj != null) Object.Destroy(obj.gameObject);
        }
        foreach (var obj in _inUse)
        {
            if (obj != null) Object.Destroy(obj.gameObject);
        }
        _available.Clear();
        _inUse.Clear();
    }
}
