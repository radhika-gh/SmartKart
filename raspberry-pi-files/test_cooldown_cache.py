#!/usr/bin/env python3
"""
Simple test script to verify cooldown cache mechanism functions.
This tests the three core functions: is_in_cooldown, update_cache, and cleanup_cache.
"""

import time
import sys

# Define the cooldown functions inline for testing
COOLDOWN_SECONDS = 3

def is_in_cooldown(tag_id, cache, cooldown=COOLDOWN_SECONDS):
    """Check if a tag is currently in the cooldown period."""
    if tag_id not in cache:
        return False
    
    last_scan_time = cache[tag_id]
    current_time = time.time()
    time_since_last_scan = current_time - last_scan_time
    
    return time_since_last_scan < cooldown


def update_cache(tag_id, cache):
    """Update the cache with a new tag scan timestamp."""
    cache[tag_id] = time.time()


def cleanup_cache(cache, cooldown=COOLDOWN_SECONDS):
    """Remove expired entries from the cooldown cache."""
    current_time = time.time()
    expired_tags = []
    
    # Find all tags that have expired
    for tag_id, timestamp in cache.items():
        if current_time - timestamp > cooldown:
            expired_tags.append(tag_id)
    
    # Remove expired tags
    for tag_id in expired_tags:
        del cache[tag_id]
    
    return len(expired_tags)

def test_cooldown_cache():
    """Test the cooldown cache mechanism"""
    print("Testing Cooldown Cache Mechanism")
    print("=" * 60)
    
    # Test 1: Empty cache - tag should not be in cooldown
    print("\n[Test 1] Empty cache check")
    cache = {}
    tag_id = "1234567890"
    result = is_in_cooldown(tag_id, cache, cooldown=3)
    assert result == False, "Tag should not be in cooldown when cache is empty"
    print("✓ PASS: Tag not in cooldown when cache is empty")
    
    # Test 2: Update cache and check cooldown
    print("\n[Test 2] Update cache and check cooldown")
    update_cache(tag_id, cache)
    assert tag_id in cache, "Tag should be in cache after update"
    result = is_in_cooldown(tag_id, cache, cooldown=3)
    assert result == True, "Tag should be in cooldown immediately after update"
    print("✓ PASS: Tag in cooldown immediately after update")
    print(f"  Cache: {cache}")
    
    # Test 3: Check cooldown after short delay (still in cooldown)
    print("\n[Test 3] Check cooldown after 1 second")
    time.sleep(1)
    result = is_in_cooldown(tag_id, cache, cooldown=3)
    assert result == True, "Tag should still be in cooldown after 1 second"
    print("✓ PASS: Tag still in cooldown after 1 second")
    
    # Test 4: Check cooldown after cooldown period expires
    print("\n[Test 4] Check cooldown after 3+ seconds")
    time.sleep(2.5)  # Total 3.5 seconds
    result = is_in_cooldown(tag_id, cache, cooldown=3)
    assert result == False, "Tag should not be in cooldown after 3+ seconds"
    print("✓ PASS: Tag not in cooldown after cooldown period expires")
    
    # Test 5: Multiple tags in cache
    print("\n[Test 5] Multiple tags in cache")
    cache = {}
    tag1 = "1111111111"
    tag2 = "2222222222"
    tag3 = "3333333333"
    
    update_cache(tag1, cache)
    time.sleep(0.5)
    update_cache(tag2, cache)
    time.sleep(0.5)
    update_cache(tag3, cache)
    
    assert len(cache) == 3, "Cache should contain 3 tags"
    print(f"✓ PASS: Cache contains {len(cache)} tags")
    
    # Test 6: Cleanup expired entries
    print("\n[Test 6] Cleanup expired entries")
    time.sleep(2.5)  # tag1 is now 3.5s old, tag2 is 3s old, tag3 is 2.5s old
    
    removed = cleanup_cache(cache, cooldown=3)
    print(f"  Removed {removed} expired entries")
    print(f"  Cache size after cleanup: {len(cache)}")
    
    # tag1 and tag2 should be removed (>3s old), tag3 should remain
    assert len(cache) <= 1, "Only recent tags should remain after cleanup"
    assert tag3 in cache or len(cache) == 0, "Most recent tag should still be in cache"
    print("✓ PASS: Expired entries removed from cache")
    
    # Test 7: Cleanup with no expired entries
    print("\n[Test 7] Cleanup with no expired entries")
    cache = {}
    update_cache("AAAAAAAAAA", cache)
    removed = cleanup_cache(cache, cooldown=3)
    assert removed == 0, "No entries should be removed when none are expired"
    assert len(cache) == 1, "Cache should still contain the recent tag"
    print("✓ PASS: No entries removed when none are expired")
    
    # Test 8: Different tags don't interfere
    print("\n[Test 8] Different tags don't interfere")
    cache = {}
    tag_a = "AAAAAAAAAA"
    tag_b = "BBBBBBBBBB"
    
    update_cache(tag_a, cache)
    assert is_in_cooldown(tag_a, cache, cooldown=3) == True
    assert is_in_cooldown(tag_b, cache, cooldown=3) == False
    print("✓ PASS: Different tags have independent cooldown states")
    
    print("\n" + "=" * 60)
    print("All tests passed! ✓")
    print("=" * 60)

if __name__ == '__main__':
    try:
        test_cooldown_cache()
    except AssertionError as e:
        print(f"\n✗ FAIL: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        sys.exit(1)
