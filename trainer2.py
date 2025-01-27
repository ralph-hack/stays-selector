import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# Load the CSV file
data = pd.read_csv("1_month_colombia_MOD.csv")

print("Loaded data:")
print("Head:")
print(data.head())
print("Tail:")
print(data.tail())

print("Data Types Check:")
print(data.dtypes)

# Fill missing values
numeric_cols = data.select_dtypes(include=["number"])  # Select numeric columns
data[numeric_cols.columns] = numeric_cols.fillna(numeric_cols.mean())  # Fill numeric missing values with mean
data = data.fillna("-1")  # Fill other missing values with "Unknown"

print("After filling missing values:")
print(data.head())

# Separate features (X) and labels (y)
X_text = data[["City", "Like", "Accommodation", "Building", "Groceries", "Restaurant", "Malls"]].astype(str).apply(
    lambda x: " ".join(x), axis=1)  # Combine text columns into a single string
X_num = data[[
    "Rating", "TotalPrice", "Rate", "RatePercent", "Cleaning", "AirbnbFee", "FeeTotal", "FeePercent",
    "BathCount", "BedCount", "TVCount", "RestaurantCount", "GroceryStoreCount", "MallCount", "TV", "Sqm", "Floor",
    "Ceiling", "Wifi", "AC", "WasherDryer", "Fans", "HotWater", "Essentials", "SelfCheckin", "Luggage Dropoff", "Gym",
    "Elevator", "View", "Balcony", "Workspace", "Pool", "HotTub", "PoolTable", "PingTable", "OutdoorShower", "Resort"
]].values
y = data["WantIt"].values

# Transform text data with CountVectorizer
vectorizer = CountVectorizer()
X_text_vec = vectorizer.fit_transform(X_text)

# Concatenate text and numerical features
X_combined = np.hstack((X_text_vec.toarray(), X_num))

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
print("Predictions on test data:")
print(predictions)

# Evaluate the model's performance
print(classification_report(y_test, predictions))
print(confusion_matrix(y_test, predictions))

# Visualize the confusion matrix
plt.figure(figsize=(8, 6))
sns.heatmap(confusion_matrix(y_test, predictions), annot=True, fmt='d', cmap='Blues')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix')
plt.show()

################################################################
## PREDICTION
################################################################

# Load the example data for predictions
examples = pd.read_csv("1_month_colombia_example2.csv")

print("Loaded examples:")
print("Head:")
print(examples.head())
print("Tail:")
print(examples.tail())

print("Examples Types Check:")
print(examples.dtypes)

# Fill missing values
numeric_cols = examples.select_dtypes(include=["number"])  # Select numeric columns
examples[numeric_cols.columns] = numeric_cols.fillna(numeric_cols.mean())  # Fill numeric missing values with mean
examples = examples.fillna("-1")  # Fill other missing values with "Unknown"

# Prepare features for predictions
X_examples_text = examples[["City", "Like", "Accommodation", "Building", "Groceries", "Restaurant", "Malls"]].astype(str).apply(
    lambda x: " ".join(x), axis=1)  # Combine text columns into a single string
X_examples_num = examples[[
    "Rating", "TotalPrice", "Rate", "RatePercent", "Cleaning", "AirbnbFee", "FeeTotal", "FeePercent",
    "BathCount", "BedCount", "TVCount", "RestaurantCount", "GroceryStoreCount", "MallCount", "TV", "Sqm", "Floor",
    "Ceiling", "Wifi", "AC", "WasherDryer", "Fans", "HotWater", "Essentials", "SelfCheckin", "Luggage Dropoff", "Gym",
    "Elevator", "View", "Balcony", "Workspace", "Pool", "HotTub", "PoolTable", "PingTable", "OutdoorShower", "Resort"
]].values

# Transform the example text data with the same CountVectorizer
X_examples_text_vec = vectorizer.transform(X_examples_text)

# Concatenate text and numerical features for examples
X_examples_combined = np.hstack((X_examples_text_vec.toarray(), X_examples_num))

# Make predictions on the examples
predictions = clf.predict(X_examples_combined)
print("Predictions on example data:")
print(predictions)
