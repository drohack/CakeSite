#!/usr/bin/env python3
"""
Load testing script for FMK Quiz application.
Simulates 50 concurrent users voting.
"""

import asyncio
import aiohttp
import time
import statistics
from datetime import datetime

# Configuration
BASE_URL = 'http://localhost:5000'
NUM_USERS = 100

# Test results storage
results = {
    'successful_votes': 0,
    'failed_votes': 0,
    'response_times': [],
    'errors': []
}

async def simulate_smashpass_user(session, user_id):
    """Simulate a single Smash or Pass user."""
    try:
        start_time = time.time()

        # Get current vote
        async with session.get(f'{BASE_URL}/vote/current') as resp:
            if resp.status != 200:
                results['failed_votes'] += 1
                results['errors'].append(f"User {user_id}: Failed to get current vote")
                return

            data = await resp.json()

            if data.get('type') != 'smashpass':
                results['errors'].append(f"User {user_id}: No S/P session active")
                return

            # Submit a vote (randomly choose smash or pass)
            import random
            vote_choice = random.choice(['smash', 'pass'])

            vote_data = {
                'session_id': data['session_id'],
                'image_id': data['image']['id'],
                'vote': vote_choice
            }

            async with session.post(f'{BASE_URL}/smashpass/vote', json=vote_data) as vote_resp:
                if vote_resp.status == 200:
                    results['successful_votes'] += 1
                    response_time = time.time() - start_time
                    results['response_times'].append(response_time)
                else:
                    results['failed_votes'] += 1
                    error_text = await vote_resp.text()
                    results['errors'].append(f"User {user_id}: Vote failed - {error_text[:100]}")

    except Exception as e:
        results['failed_votes'] += 1
        results['errors'].append(f"User {user_id}: Exception - {str(e)}")


async def simulate_mfk_user(session, user_id):
    """Simulate a single MFK user."""
    try:
        start_time = time.time()

        # Get current vote
        async with session.get(f'{BASE_URL}/vote/current') as resp:
            if resp.status != 200:
                results['failed_votes'] += 1
                results['errors'].append(f"User {user_id}: Failed to get current vote")
                return

            data = await resp.json()

            if data.get('type') != 'mfk':
                results['errors'].append(f"User {user_id}: No MFK poll active")
                return

            # Submit MFK vote (random assignments)
            images = data['group']['images']
            import random
            random.shuffle(images)

            vote_data = {
                'poll_id': data['poll_id'],
                'group_id': data['group']['id'],
                'marry_image_id': images[0]['id'],
                'f_image_id': images[1]['id'],
                'kill_image_id': images[2]['id']
            }

            async with session.post(f'{BASE_URL}/poll/submit', json=vote_data) as vote_resp:
                if vote_resp.status == 200:
                    results['successful_votes'] += 1
                    response_time = time.time() - start_time
                    results['response_times'].append(response_time)
                else:
                    results['failed_votes'] += 1
                    error_text = await vote_resp.text()
                    results['errors'].append(f"User {user_id}: Vote failed - {error_text[:100]}")

    except Exception as e:
        results['failed_votes'] += 1
        results['errors'].append(f"User {user_id}: Exception - {str(e)}")


async def run_smashpass_load_test():
    """Run load test for Smash or Pass."""
    print("=" * 70)
    print("SMASH OR PASS LOAD TEST")
    print("=" * 70)
    print(f"Simulating {NUM_USERS} concurrent users voting on Smash or Pass...")
    print()

    # Reset results
    results['successful_votes'] = 0
    results['failed_votes'] = 0
    results['response_times'] = []
    results['errors'] = []

    # Create session with connection pooling
    connector = aiohttp.TCPConnector(limit=NUM_USERS)
    async with aiohttp.ClientSession(connector=connector) as session:
        # Create tasks for all users
        tasks = [simulate_smashpass_user(session, i) for i in range(NUM_USERS)]

        # Run all tasks concurrently
        start_time = time.time()
        await asyncio.gather(*tasks)
        total_time = time.time() - start_time

    print_results(total_time)


async def run_mfk_load_test():
    """Run load test for MFK."""
    print("=" * 70)
    print("MARRY FUCK KILL LOAD TEST")
    print("=" * 70)
    print(f"Simulating {NUM_USERS} concurrent users voting on MFK...")
    print()

    # Reset results
    results['successful_votes'] = 0
    results['failed_votes'] = 0
    results['response_times'] = []
    results['errors'] = []

    # Create session with connection pooling
    connector = aiohttp.TCPConnector(limit=NUM_USERS)
    async with aiohttp.ClientSession(connector=connector) as session:
        # Create tasks for all users
        tasks = [simulate_mfk_user(session, i) for i in range(NUM_USERS)]

        # Run all tasks concurrently
        start_time = time.time()
        await asyncio.gather(*tasks)
        total_time = time.time() - start_time

    print_results(total_time)


def print_results(total_time):
    """Print test results."""
    print("RESULTS:")
    print("-" * 70)
    print(f"Total Users:        {NUM_USERS}")
    print(f"Successful Votes:   {results['successful_votes']} ({results['successful_votes']/NUM_USERS*100:.1f}%)")
    print(f"Failed Votes:       {results['failed_votes']} ({results['failed_votes']/NUM_USERS*100:.1f}%)")
    print(f"Total Time:         {total_time:.2f} seconds")

    if results['response_times']:
        print()
        print("RESPONSE TIMES:")
        print(f"  Min:     {min(results['response_times']):.3f}s")
        print(f"  Max:     {max(results['response_times']):.3f}s")
        print(f"  Average: {statistics.mean(results['response_times']):.3f}s")
        print(f"  Median:  {statistics.median(results['response_times']):.3f}s")

    if results['errors']:
        print()
        print(f"ERRORS ({len(results['errors'])}):")
        for error in results['errors'][:10]:  # Show first 10 errors
            print(f"  - {error}")
        if len(results['errors']) > 10:
            print(f"  ... and {len(results['errors']) - 10} more errors")

    print()
    print("=" * 70)


async def check_active_poll():
    """Check what poll is currently active."""
    async with aiohttp.ClientSession() as session:
        async with session.get(f'{BASE_URL}/vote/current') as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('type')
            return None


async def main():
    """Main test runner."""
    print()
    print("=" * 70)
    print("FMK QUIZ - LOAD TESTING TOOL")
    print("=" * 70)
    print(f"Testing server at: {BASE_URL}")
    print(f"Concurrent users:  {NUM_USERS}")
    print(f"Started at:        {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Check what's active
    print("Checking for active polls...")
    active_type = await check_active_poll()

    if active_type == 'smashpass':
        print("OK Smash or Pass session is active")
        print()
        await run_smashpass_load_test()

    elif active_type == 'mfk':
        print("OK MFK poll is active")
        print()
        await run_mfk_load_test()

    else:
        print("X No active voting session found!")
        print()
        print("INSTRUCTIONS:")
        print("1. Go to http://localhost:5000/admin")
        print("2. Start either a Smash or Pass session OR an MFK poll")
        print("3. Run this test again")
        print()
        return

    print()
    print("LOAD TEST COMPLETED!")
    print()
    print("RECOMMENDATIONS:")
    if results['successful_votes'] == NUM_USERS:
        print("OK All votes successful! Server handled the load perfectly.")
    elif results['successful_votes'] >= NUM_USERS * 0.95:
        print("OK 95%+ success rate. Server performance is good.")
    elif results['successful_votes'] >= NUM_USERS * 0.80:
        print("! 80-95% success rate. Server is handling load but may need optimization.")
    else:
        print("X <80% success rate. Server is struggling with this load.")

    if results['response_times']:
        avg_time = statistics.mean(results['response_times'])
        if avg_time < 0.5:
            print("OK Fast response times (< 0.5s average)")
        elif avg_time < 1.0:
            print("OK Good response times (< 1s average)")
        elif avg_time < 2.0:
            print("! Acceptable response times (1-2s average)")
        else:
            print("X Slow response times (> 2s average)")

    print()


if __name__ == '__main__':
    try:
        import sys
        if sys.platform == 'win32':
            # Windows specific event loop policy
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except ImportError as e:
        print(f"\nError: Missing required package")
        print(f"Please install: pip install aiohttp")
        print(f"Error details: {e}")
