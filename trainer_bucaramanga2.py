import pandas as pd

# Load the CSV file
data = pd.read_csv("./train/bucaramanga/train_mod2.csv")

print("Loaded data:")
print("Head:")
print(data.head())
print("Tail:")
print(data.tail())  

print("Data Types Check:")
print(data.dtypes)

print("Filled missing values:")
# Fill missing values in numeric columns with the mean
numeric_cols = data.select_dtypes(include=["number"])  # Select numeric columns
data[numeric_cols.columns] = numeric_cols.fillna(numeric_cols.mean())  # Apply mean filling to numeric columns
# If there are categorical or string columns, you can decide how to handle missing values for them.
# For example, fill them with a placeholder value like "Unknown" or leave them as is:
data = data.fillna("-1")  # Optional for numeric columns
print(data.head())


# # Perform one-hot encoding
# one_hot_encoded_df = pd.get_dummies(data, columns=['City'])

# # Display the result
# print("Original DataFrame:")
# print(data)
# print("\nOne-Hot Encoded DataFrame:")
# print(one_hot_encoded_df)


# Separate features (X) and labels (y)
X_text = data[[ "Like",
                      "Accommodation"]].astype(str).apply(

    lambda x: " ".join(x), axis=1)  # Combine text columns into a single string
X_num = data[[
                        "Rating", "TotalPrice", "Rate", "RatePercent", "CleaningFee", "AirbnbFee", "FeeTotal", "FeePercent","BedroomCount", "TV","TV2", "Sqm", "Floor", 
                      "CeilingHeight",
                        "Wifi", "AC"]].values  # Features
y = data["Want"].values  # Labels

# import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
import numpy as np

# Transform text data with CountVectorizer
vectorizer = CountVectorizer()
X_text_vec = vectorizer.fit_transform(X_text)

# Concatenate text and numerical features
X_combined = np.hstack((X_text_vec.toarray(), X_num))


print("Features (X_combined):", X_combined)
print("Labels (y):", y)


from sklearn.svm import SVC
from sklearn.model_selection import train_test_split

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X_combined, y, test_size=0.2, random_state=42)

# Train the classifier
clf = SVC(kernel='linear')
clf.fit(X_train, y_train)

# Evaluate the model
accuracy = clf.score(X_test, y_test)
print(f"Accuracy: {accuracy:.2f}")

# Make predictions
predictions = clf.predict(X_test)
print("Features (X_text):", X_test)
print("Predictions (X_test):", predictions)

# Evaluate the model's performance
from sklearn.metrics import classification_report, confusion_matrix
print(classification_report(y_test, predictions))
print(confusion_matrix(y_test, predictions))

# Visualize the confusion matrix
import seaborn as sns
import matplotlib.pyplot as plt
plt.figure(figsize=(8, 6))
sns.heatmap(confusion_matrix(y_test, predictions), annot=True, fmt='d', cmap='Blues')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix')
plt.show()


################################################################
## PREDICTION 
################################################################

examples = pd.read_csv("./train/bucaramanga/examples.csv")
print("Loaded examples:")
print("Head:")
print(examples.head())
print("Tail:")
print(examples.tail())  

print("Examples Types Check:")
print(examples.dtypes)

print("Filled missing values:")
# Fill missing values in numeric columns with the mean
numeric_cols = examples.select_dtypes(include=["number"])  # Select numeric columns
examples[numeric_cols.columns] = numeric_cols.fillna(numeric_cols.mean())  # Apply mean filling to numeric columns
# If there are categorical or string columns, you can decide how to handle missing values for them.
# For example, fill them with a placeholder value like "Unknown" or leave them as is:
examples = examples.fillna("-1")  # Optional for numeric columns
print(examples.head())


# Perform one-hot encoding
#one_hot_encoded_df = pd.get_dummies(examples, columns=['City'])

# Display the result
print("Original DataFrame:")
print(examples)
print("\nOne-Hot Encoded DataFrame:")
#print(one_hot_encoded_df)


# Separate features (X) and labels (y)
X_examples_text = examples[[ "Like",
                        "Accommodation"]].astype(str).apply(
    lambda x: " ".join(x), axis=1)  # Combine text columns into a single string

X_examples_num = examples[[
                        "Rating", "TotalPrice", "Rate", "RatePercent", "CleaningFee", "AirbnbFee", "FeeTotal", "FeePercent","BedroomCount", "TV","TV2", "Sqm", "Floor", 
                      "CeilingHeight",
                        "Wifi", "AC"]].values  # Features
#y = one_hot_encoded_df["WantIt"].values  # Labels
# Transform the example text data with the same CountVectorizer
X_examples_text_vec = vectorizer.transform(X_examples_text)

# Concatenate text and numerical features for examples
X_examples_combined = np.hstack((X_examples_text_vec.toarray(), X_examples_num))

print("Features (X_examples_combined):", X_examples_combined)
#print("Labels (y):", y)
# Make predictions
predictions = clf.predict(X_examples_combined)
print("Predictions (X_examples_combined):", predictions)


print("Transpose (Column Vector):")
print(predictions.T)

import numpy as np
np.savetxt("predictionsV2.txt", predictions.T, fmt='%d', header="Predictions", comments='')
print("Column saved to predictions.txt")