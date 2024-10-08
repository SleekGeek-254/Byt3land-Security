import random
import numpy as np
import matplotlib.pyplot as plt
import csv
from datetime import datetime

q = 4294967291  # Largest prime number smaller than 2^32
n = 1024        # Lattice dimension
m = 2048        # Number of samples

def text_to_binary(text):
    return ''.join(format(ord(char), '08b') for char in text)

def binary_to_text(binary):
    return ''.join(chr(int(binary[i:i+8], 2)) for i in range(0, len(binary), 8))

def generate_matrix(m, n, q):
    return np.random.randint(0, q, size=(m, n), dtype=np.int64)

def generate_error(size, sigma):
    return np.random.normal(0, sigma, size).astype(np.int64)

def bob_key_generation(n, m, q):
    A = generate_matrix(m, n, q)
    s = np.random.randint(0, q, size=n, dtype=np.int64)
    e = generate_error(m, sigma=1)
    b = (np.dot(A, s) + e) % q
    # print(f"Resulting b : {b }")
    # print(f"Resulting A : {A }")

    
    return A, b, s

def alice_encrypt_chunk(binary_chunk, A, b, n, m, q):
    # Encrypt each bit in the chunk
    encrypted_bits = []
    for bit in binary_chunk:
        selected_indices = random.sample(range(m), 2)
        selected_rowsA = A[selected_indices]
        selected_rowsb = b[selected_indices]
        row_sumA = np.sum(selected_rowsA, axis=0)
        row_sumB = np.sum(selected_rowsb)
        if bit == '0':
            c2 = row_sumB % q
        else:  # bit == '1'
            c2 = (row_sumB + q//2) % q
        encrypted_bits.append((row_sumA, c2))

    return encrypted_bits


def alice_encrypt(message, A, b, n, m, q):
    binary_message = text_to_binary(message)
    chunk_size = m
    chunks = [binary_message[i:i+chunk_size] for i in range(0, len(binary_message), chunk_size)]
    
    encrypted_chunks = []
    for chunk in chunks:
        encrypted_chunks.extend(alice_encrypt_chunk(chunk, A, b, n, m, q))
    return encrypted_chunks

def bob_decrypt_bit(c1, c2, s, q):
    inner_product = np.dot(c1, s) % q
    decrypted = (c2 - inner_product) % q
    if decrypted < q/4 or decrypted > 3*q/4:
        return '0'
    else:
        return '1'

def bob_decrypt(encrypted_bits, s, q):
    decrypted_binary = ''
    for c1, c2 in encrypted_bits:
        decrypted_binary += bob_decrypt_bit(c1, c2, s, q)
    return binary_to_text(decrypted_binary).rstrip('\x00')

def run_simulation(encrypted_bits, n, s, q, max_iterations):
    for iterations in range(1, max_iterations + 1):
        incorrect_key = np.random.randint(0, q, size=n, dtype=np.int64)
        
        decrypted_message = bob_decrypt(encrypted_bits, incorrect_key, q)
        
        # Calculate the percentage of true ASCII characters
        ascii_count = sum(1 for char in decrypted_message if 0 <= ord(char) <= 127)
        ascii_percentage = ascii_count / len(decrypted_message)
        
        # Check if the ASCII percentage meets the threshold
        if ascii_percentage >= 1:
            return iterations, decrypted_message, True
    
    return max_iterations, decrypted_message, False

 
num_simulations = 500
max_iterations = 1000

message = "Hello Kitty! This is a much longer message to test our improved system. " \
          "Now we can encrypt messages of arbitrary length by splitting them into multiple chunks. " \
          "This demonstrates a more practical application of our lattice-based cryptosystem."

# Prepare CSV file
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
csv_filename = f"encryption_simulation_results_{timestamp}.csv"

with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
    csvwriter = csv.writer(csvfile, quoting=csv.QUOTE_MINIMAL, escapechar='\\')
    csvwriter.writerow(['Simulation', 'Iterations', 'Success', 'Decrypted Message'])

    # Run simulations
    print("Running simulations...")
    iteration_counts = []
    success_counts = []
    A, b, s = bob_key_generation(n, m, q)
    encrypted_chunks = alice_encrypt(message, A, b, n, m, q)
    print("Starting simulations Post Gen and Enc...")
    for sim in range(1, num_simulations + 1):
        iterations, decrypted_message, success = run_simulation(encrypted_chunks, n, s, q, max_iterations)
        iteration_counts.append(iterations)
        success_counts.append(success)
        csvwriter.writerow([sim, iterations, success, decrypted_message])
        print(f"Simulation {sim}/{num_simulations} complete")
        
        if success:
            print(f"Successful decryption found in Simulation {sim}. Stopping further simulations.")
            break

# Calculate statistics
avg_iterations = np.mean(iteration_counts)
max_iterations_observed = np.max(iteration_counts)
min_iterations = np.min(iteration_counts)
success_rate = sum(success_counts) / num_simulations * 100

# Create histogram
plt.figure(figsize=(10, 6))
plt.hist(iteration_counts, bins=range(min(iteration_counts), max_iterations_observed + 2, 1), 
         edgecolor='black')
plt.title('Distribution of Iterations to Decryption Attempt')
plt.xlabel('Number of Iterations')
plt.ylabel('Frequency')
plt.grid(True, alpha=0.3)

# Add statistical information to the plot
plt.text(0.95, 0.95, f'Simulations: {num_simulations}\nAvg: {avg_iterations:.2f}\n'
                     f'Max: {max_iterations_observed}\nMin: {min_iterations}\n'
                     f'Success Rate: {success_rate:.2f}%', 
         transform=plt.gca().transAxes, verticalalignment='top', horizontalalignment='right',
         bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

plt.tight_layout()
plt.savefig(f'encryption_simulation_histogram_{timestamp}.png')
plt.show()

print(f"\nSimulation Results:")
print(f"Number of simulations: {num_simulations}")
print(f"Average iterations: {avg_iterations:.2f}")
print(f"Maximum iterations observed: {max_iterations_observed}")
print(f"Minimum iterations: {min_iterations}")
print(f"Success rate: {success_rate:.2f}%")
print(f"\nResults saved to {csv_filename}")
print(f"Histogram saved as encryption_simulation_histogram_{timestamp}.png")