using System.Collections.Generic;
using UnityEngine;

public class BezierPath : MonoBehaviour
{
    [SerializeField] private List<Vector2> controlPoints = new List<Vector2>();
    [SerializeField] private int curveResolution = 50;

    [Header("Debug")]
    [SerializeField] private bool showGizmos = true;
    [SerializeField] private Color pathColor = Color.yellow;
    [SerializeField] private Color controlPointColor = Color.green;
    [SerializeField] private Color handleColor = Color.red;

    private List<float> segmentLengths = new List<float>();
    private float _totalLength;
    public float TotalLength => _totalLength;

    public int SegmentCount => Mathf.Max(0, (controlPoints.Count - 1) / 3);

    private void OnValidate()
    {
        if (controlPoints.Count >= 4 && (controlPoints.Count - 1) % 3 == 0)
            RecalculateLengths();
    }

    private void Awake()
    {
        RecalculateLengths();
    }

    public void SetControlPoints(List<Vector2> points)
    {
        controlPoints = new List<Vector2>(points);
        RecalculateLengths();
    }

    public List<Vector2> GetControlPoints()
    {
        return new List<Vector2>(controlPoints);
    }

    public void RecalculateLengths()
    {
        segmentLengths.Clear();
        _totalLength = 0f;

        int segments = SegmentCount;
        for (int i = 0; i < segments; i++)
        {
            var pts = GetSegmentPoints(i);
            float len = ApproximateSegmentLength(pts.p0, pts.p1, pts.p2, pts.p3, curveResolution);
            segmentLengths.Add(len);
            _totalLength += len;
        }
    }

    public Vector2 GetPositionAtProgress(float t01)
    {
        t01 = Mathf.Clamp01(t01);
        if (segmentLengths.Count == 0) return controlPoints.Count > 0 ? controlPoints[0] : Vector2.zero;

        float targetDist = t01 * _totalLength;
        float accumulated = 0f;

        for (int i = 0; i < segmentLengths.Count; i++)
        {
            if (targetDist <= accumulated + segmentLengths[i] || i == segmentLengths.Count - 1)
            {
                float localT = segmentLengths[i] > 0.001f
                    ? (targetDist - accumulated) / segmentLengths[i]
                    : 0f;
                var pts = GetSegmentPoints(i);
                return EvaluateCubic(pts.p0, pts.p1, pts.p2, pts.p3, Mathf.Clamp01(localT));
            }
            accumulated += segmentLengths[i];
        }

        var lastSeg = GetSegmentPoints(segmentLengths.Count - 1);
        return lastSeg.p3;
    }

    public float GetProgressForPosition(Vector2 point)
    {
        float bestProgress = 0f;
        float bestDistSqr = float.MaxValue;

        int samples = curveResolution * SegmentCount;
        for (int i = 0; i <= samples; i++)
        {
            float t = i / (float)samples;
            Vector2 pos = GetPositionAtProgress(t);
            float dSqr = (pos - point).sqrMagnitude;
            if (dSqr < bestDistSqr)
            {
                bestDistSqr = dSqr;
                bestProgress = t;
            }
        }
        return bestProgress;
    }

    public float GetRemainingDistance(float currentProgress)
    {
        return _totalLength * (1f - Mathf.Clamp01(currentProgress));
    }

    public Vector2 GetStartPoint()
    {
        return controlPoints.Count > 0 ? controlPoints[0] : Vector2.zero;
    }

    public Vector2 GetEndPoint()
    {
        return controlPoints.Count > 0 ? controlPoints[controlPoints.Count - 1] : Vector2.zero;
    }

    public Vector2 GetDirectionAtProgress(float t01)
    {
        float epsilon = 0.001f;
        float t1 = Mathf.Clamp01(t01 - epsilon);
        float t2 = Mathf.Clamp01(t01 + epsilon);
        return (GetPositionAtProgress(t2) - GetPositionAtProgress(t1)).normalized;
    }

    private (Vector2 p0, Vector2 p1, Vector2 p2, Vector2 p3) GetSegmentPoints(int segmentIndex)
    {
        int baseIdx = segmentIndex * 3;
        return (
            controlPoints[baseIdx],
            controlPoints[baseIdx + 1],
            controlPoints[baseIdx + 2],
            controlPoints[Mathf.Min(baseIdx + 3, controlPoints.Count - 1)]
        );
    }

    public static Vector2 EvaluateCubic(Vector2 p0, Vector2 p1, Vector2 p2, Vector2 p3, float t)
    {
        float u = 1f - t;
        float uu = u * u;
        float uuu = uu * u;
        float tt = t * t;
        float ttt = tt * t;
        return uuu * p0 + 3f * uu * t * p1 + 3f * u * tt * p2 + ttt * p3;
    }

    private float ApproximateSegmentLength(Vector2 p0, Vector2 p1, Vector2 p2, Vector2 p3, int samples)
    {
        float length = 0f;
        Vector2 prev = p0;

        for (int i = 1; i <= samples; i++)
        {
            float t = i / (float)samples;
            Vector2 current = EvaluateCubic(p0, p1, p2, p3, t);
            length += Vector2.Distance(prev, current);
            prev = current;
        }
        return length;
    }

    #if UNITY_EDITOR
    private void OnDrawGizmos()
    {
        if (!showGizmos || controlPoints.Count < 4 || (controlPoints.Count - 1) % 3 != 0)
            return;

        // Draw path
        Gizmos.color = pathColor;
        int totalSamples = curveResolution * SegmentCount;
        Vector2 offset = (Vector2)transform.position;

        for (int i = 1; i <= totalSamples; i++)
        {
            float t0 = (i - 1) / (float)totalSamples;
            float t1 = i / (float)totalSamples;
            Gizmos.DrawLine(
                offset + GetPositionAtProgress(t0),
                offset + GetPositionAtProgress(t1)
            );
        }

        // Draw control points and handles
        for (int i = 0; i < controlPoints.Count; i++)
        {
            bool isAnchor = i % 3 == 0;
            Gizmos.color = isAnchor ? controlPointColor : handleColor;
            Gizmos.DrawSphere(offset + controlPoints[i], 0.15f);

            if (i > 0)
            {
                Gizmos.color = isAnchor ? controlPointColor : handleColor;
                Gizmos.DrawLine(offset + controlPoints[i - 1], offset + controlPoints[i]);
            }
        }
    }
    #endif
}
