import pandas as pd

# Load the CSV file
data = pd.read_csv("1_month_colombia.csv")

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
data = data.fillna("Unknown")  # Optional for non-numeric columns
print(data.head())


# Perform one-hot encoding
one_hot_encoded_df = pd.get_dummies(data, columns=['City'])

# Display the result
print("Original DataFrame:")
print(data)
print("\nOne-Hot Encoded DataFrame:")
print(one_hot_encoded_df)


# Separate features (X) and labels (y)
X = one_hot_encoded_df[["City_Cucuta","City_Bucaramanga","City_Ibague","City_Itagui","City_Melgar","City_Ricaurte","City_Mompos","City_Monteria","City_Girardot", "Like", "Accommodation", "Rating", "TotalPrice", "Rate", "RatePercent", "Cleaning", "AirbnbFee", "FeeTotal", "FeePercent", "BathCount", "BedCount", "TVCount", "RestaurantCount", "GroceryStoreCount", "MallCount", "TV", "Sqm", "Floor", "Building", "Ceiling", "Groceries", "Restaurant", "Malls", "Wifi", "AC", "WasherDryer", "Fans", "HotWater", "Essentials", "SelfCheckin", "Luggage Dropoff", "Gym", "Elevator", "View", "Balcony", "Workspace", "Pool", "HotTub", "PoolTable", "PingTable", "OutdoorShower", "Resort"]].values  # Features
y = one_hot_encoded_df["WantIt"].values  # Labels

print("Features (X):", X)
print("Labels (y):", y)


from sklearn.svm import SVC
from sklearn.model_selection import train_test_split

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train the classifier
clf = SVC(kernel='linear')
clf.fit(X_train, y_train)

# Evaluate the model
accuracy = clf.score(X_test, y_test)
print(f"Accuracy: {accuracy:.2f}")




