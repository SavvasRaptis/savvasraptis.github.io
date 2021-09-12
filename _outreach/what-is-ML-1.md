---
title: "What is Machine Learning - Part 1"
layout: single-portfolio
excerpt: "<img src='/images/NN_preview.png' alt=''>"
collection: outreach
order_number: 10
header:
  og_image: "NN_preview.png"
---

The following article is a translation of the article written for the Greek outreach site of [2' science](https://2science.gr/)

## Article

Machine learning is the field of computer science that studies algorithms capable of "learning" without having been explicitly programmed with specific rules. In other words, these algorithms use data to discover patterns and relationships in order to make predictions or decisions. References to machine learning date back to the 1960s, although the actual use of these techniques increased rapidly after the 1990s as a result of the development of other computer science disciplines such as file digitization, data mining and supercomputers.

In the first article of this series we will discuss the 3 most basic forms of machine learning!

### Supervised Learning

Supervised learning is the technique in which a program is trained to understand the relationship between the data we provide and a desired outcome. In this case, we have a predefined input (data) and a known output (result). Alternatively, it is common to say that we have data with labels that indicate the connection to the output. These labels have been assigned by people or other codes (supervised). In this form of learning, the purpose of the program is to understand the relationship between the input and the output. In the example shown below, we see a the illustrated input being dataset containing 280,000 handwritten numbers from 0 to 9. Here, for the input we have the image from each number and for the output the corresponding number each image. What we want to do is to train the computer to do what we humans do with our own eyes, to learn to recognize images that represent numbers!

Below we can see a visualization of a neural network. This is one of the most widely used supervised learning techniques. In this example it shows how a computer is able to recognize hand-written numbers! Credits: [3 Blue 1 Brown | Neural Networks](https://www.youtube.com/watch?v=aircAruvnKk).

![figure 1](/outreach/what-is-ML-1_fig_1.gif)



### Unsupervised Learning
In the case of unsupervised learning, it is only the input part of the data that is known and the computer is asked to identify patterns that may exist there. One of the most common application of unsupervised learning is clustering. In this case, the data are categorized into clusters that have common elements/information (see animation below). In this machine learning method, we try to reproduce how people divide things into categories. A typical example of this technique is the creation of spam filters that is typically used by e-mail providers.

Example of an unsupervised learning technique. Here we see that after some training the algorithm is capable of determining the different clusters of the data that it was given Credits: [Towards Data Science | The 5 clustering algorithms](https://towardsdatascience.com/the-5-clustering-algorithms-data-scientists-need-to-know-a36d136ef68).


![Figure 2](/outreach/what-is-ML-1_fig_2.gif)

### Reinforcement Learning

In reinforcement learning things are a bit different. Here, we create a virtual "environment" that has specific rules and we allow the computer to interact with it until it achieves a goal such as maximizing a score. At the moment most applications of this kind of learning exist in games! With the use of reinforcement learning, computers learn to play some games so well that people can no longer compete with them (see figure below). In the board game Go, the Alpha Go computer, in 2017 defeated the world champion Ke Jie using reinforcement learning! In more recent video games, we have examples such as that of [OpenAI](https://cdn.openai.com/dota-2.pdf), that in the game of DOTA 2 achieved a victory rate of over 99%, while recently it also defeated the world champions (2018, 2019) OG!

Google's Deep Mind after million of tries learned how to play the classic Atari 2600 game, "breakout" with superhuman performance. Credits : [Towards Data Science | How to match DeepMind’s Deep Q-Learning score in Breakout](https://towardsdatascience.com/tutorial-double-deep-q-learning-with-dueling-network-architectures-4c1b3fb7f756).

![Figure 3](/outreach/what-is-ML-1_fig_3.gif)

In future the next parts of the series we will look at each category separately. Doing so, we will dive into more details, examples and discuss the most common practices used today.
