from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AuthenticationTests(APITestCase):
    def test_register_hashes_password_and_does_not_return_it(self):
        response = self.client.post(
            reverse("register"),
            {"username": "student", "email": "student@example.com", "password": "strongpass123"},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], "student")
        self.assertNotIn("password", response.data)
        self.assertTrue(get_user_model().objects.get(username="student").check_password("strongpass123"))

    def test_register_rejects_duplicate_username_and_short_password(self):
        get_user_model().objects.create_user(username="student", password="strongpass123")

        duplicate = self.client.post(
            reverse("register"),
            {"username": "student", "email": "other@example.com", "password": "strongpass123"},
        )
        short_password = self.client.post(
            reverse("register"),
            {"username": "another", "email": "another@example.com", "password": "short"},
        )

        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", duplicate.data)
        self.assertEqual(short_password.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", short_password.data)

    def test_login_returns_tokens_for_username_and_password(self):
        get_user_model().objects.create_user(username="student", password="strongpass123")

        response = self.client.post(
            reverse("login"), {"username": "student", "password": "strongpass123"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        me = self.client.get(reverse("me"))
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["username"], "student")

    def test_login_rejects_wrong_password_and_me_requires_authentication(self):
        get_user_model().objects.create_user(username="student", password="strongpass123")

        response = self.client.post(
            reverse("login"), {"username": "student", "password": "wrongpass"}
        )
        me = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(me.status_code, status.HTTP_401_UNAUTHORIZED)
