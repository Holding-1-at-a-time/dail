// Function to calculate the dot product of two vectors
const dotProduct = (vecA: number[], vecB: number[]): number => {
    let product = 0;
    for (let i = 0; i < vecA.length; i++) {
        product += vecA[i] * vecB[i];
    }
    return product;
};

// Function to calculate the magnitude of a vector
const magnitude = (vec: number[]): number => {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
        sum += vec[i] * vec[i];
    }
    return Math.sqrt(sum);
};

// Function to calculate the cosine similarity between two vectors
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const product = dotProduct(vecA, vecB);
    const magA = magnitude(vecA);
    const magB = magnitude(vecB);
    
    if (magA === 0 || magB === 0) {
        return 0; // Or handle as an error, depending on your use case
    }
    
    return product / (magA * magB);
};